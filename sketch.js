/**
 @author kiwi
 @date 2022.08.01

 → the original p5-championRecon was retired because the league wiki's data is
 much more detailed and better updated than ddragon's.

 before a league of legends match starts, it'd be nice to see a list of
 opposing champion abilities and videos all in one place. the official league
 of legends champion pages require clicking, while mobaFire and op.gg lack
 videos

 what roles does this champion play? champion type: battlemage, support, etc

 data we want to display
 PQWER data laid out in grid or column, each with video
 ally and enemy tips
 blurb + longDesc
 optional: league wiki

 league wiki data is stored via JSON using this project:
 github.com/meraki-analytics/lolstaticdata
 locally stored now as fandom-champions.json
 includes all wiki info, including champion types and AP/AD scaling!

 relevant links
 root → http://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/
 champions.json
 champions/Cassiopeia.json  (indexed by champion key, found in ddragon)
 items/3001.json  (indexed by item id, found in ddragon)
 items.json

 official league data from ddragon is here:
 https://ddragon.leagueoflegends.com/cdn/12.13.1/data/en_US/champion.json
 https://ddragon.leagueoflegends.com/cdn/12.13.1/data/en_US/champion/Ahri.json

 ☐ corner overlay on 64x64 icons. veigar's icons have gray corners
 ☐ use selection color glow to indicate which ability is selected


 ☒ scrap plans to load from cdn.merakianalytics; download manually instead
 ☒ httpGet and loadJSON don't work with either json or jsonp specified
 ☒ current data retrieval comes from these sources:
     ddragon → IDs, short ability descriptions
     lolstaticdata → detailed item tooltips
     d28xe8vt774jo5.cloudfront.net → champion-abilities

 ☐ where does 'shield to the face' come from in the json XD

 ☒ ✒ draw out json load path between ddragon and lolstaticdata
 ☐ fill local data from processChampionsJSON() ← currently just logs
 ☒ use local copy of league fandom wiki json to obtain necessary ability data
 ☒ perhaps keep ddragon for ability short descriptions
 ☒ abilities → icons names [p q w e r]

 ☐ champion type: diver catcher etc. but need legacy dictionary
 values are not separated from legacy roles

 ☐ switch champions with numpad +/- one and ten. debug log number
 ☐ look up using the DOM with daniel
 ☐ eventual stat wheel :D
 visualize stats like AD growth or armor growth. comparison to other champions
 → done with lolstaticdata from meraki-analytics on GitHub
 this uses data from league wiki
 */


const SF = 0.66 /* scaling factor for video's default 1056x720 size */
const ABILITY_ICON_SIDE_LENGTH = 64 /* side length of square icon */

let fixedWidthFont
let variableWidthFont
let instructions
let debugCorner /* output debug text in the bottom left corner of the canvas */

const rootURI = 'https://ddragon.leagueoflegends.com/cdn/'
const patchString = '12.15.1/'
const rootPatchURI = 'https://ddragon.leagueoflegends.com/cdn/' + patchString
const rootLangURI = rootPatchURI + 'data/en_US/'
const allChampionsPath = 'champion.json'
const videoURI = 'https://d28xe8vt774jo5.cloudfront.net/champion-abilities/'

let championsJSON

/* 'sc' stands for 'selectedChampion' */
let scJsonURI /* loaded after setup */
let scID /* id of champion after loading specific champion json */
let scKey /* 4 digit 0-padded key of selected champion, e.g. Ahri is '0103' */
let scImg
let scDefaultBg
let scImgP /* passive ability image */
let scImgQ
let scImgW
let scImgE
let scImgR
let selectedAbilityLetter /* PQWER */

let scVideo
let lastKeypressMillis /* time since last keyPress */
let abilityKey /* stores one of PQWER to load our selected champion's video */

/* the value of the key 'data' in the specific champion json */
let scDataJSON

/* json champion data from meraki-analytics project: lolstaticdata */
const lsdRoot = 'http://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/'
let scLsdJSON

/* used for soft white drop shadow */
let dc
let milk

function preload() {
    // font = loadFont('data/rubik.ttf')
    variableWidthFont = loadFont('data/rubik.ttf')
    fixedWidthFont = loadFont('data/consola.ttf')
    let req = rootLangURI + allChampionsPath

    /* load data from riot games API: ddragon */
    championsJSON = loadJSON(req)
}


function displayDefaultInstructions() {
    instructions.html('<br>')
    // instructions.html('🥝 use [PQWER] to display passive or QWER' +
    //    ' abilities.<br> 🐳 numpad 1 → noLoop<br><br>')
}


function setup() {
    let cnv = createCanvas(SF*1056, SF*720)
    cnv.parent('#canvas')

    imageMode(CENTER)
    colorMode(HSB, 360, 100, 100, 100)
    textFont(variableWidthFont, 14)


    /* initialize variables to set up soft white glow */
    dc = drawingContext
    milk = color(207, 7, 99)

    /* initialize instruction div */
    instructions = select('#ins')
    displayDefaultInstructions()

    debugCorner = new CanvasDebugConsole(5)

    /* how many total champions are there? */

    const numChampions = Object.keys(championsJSON['data']).length
    processChampionsJSON(numChampions)
    scID = getRandomChampionID(numChampions)

    /* TODO temporarily hard coded scID */
    scID = "Qiyana"

    scKey = championsJSON['data'][scID]['key']
    scKey = scKey.padStart(4, '0') /* leading zeros necessary for video URI */

    scJsonURI = `${rootLangURI}champion/${scID}.json`

    /* load selected champion's personal json file from ddragon. here's Zoe's!
       https://ddragon.leagueoflegends.com/cdn/12.13.1/data/en_US/champion/Zoe.json
     */
    loadJSON(scJsonURI, gotSelectedChampionData)

    /*  we always get a CORS error when we try to load champion json files
        from meraki-analytics project, lolstaticdata. current solution:
        download entire file locally

        problem solving: https://github.com/processing/p5.js/wiki/Local-server
     */
}


function draw() {
    background(234, 34, 24)

    displayFullScreenVideoAndAbilities()

    /* debugCorner needs to be last so its z-index is highest */

    debugCorner.setText(`fps:${frameRate().toFixed(0)} frames:${frameCount}`, 0)
    debugCorner.setText(`champion → ${scID}`, 2)
    debugCorner.showTop()

    // if (frameCount > 3000)
    //     noLoop()
}


function displayFullScreenVideoAndAbilities() {
    /* ability videos: default size 1056, 720 */

    /* some passives have no associated video → 403 error + blank screen
        if we always load the bgImage first, then it flashes the image every
        time we switch abilities.

        todo → try loadPixels on scVideo! :D bit.ly/3QOAgEx
        solution → check loadPixels() of video. if it's blank, load bg again
     */

    if (scVideo) {
        /* video will be a valid object if it was initialized, but we need
           to check:
            1. it actually loaded, or
            2. there was a 403 error ← can't actually check because there
                isn't a callback failure argument, but we CAN check for blank
                videos by randomly selecting pixels and seeing if they are 0
         */
        scVideo.loadPixels()

        /* check n pixels. video hasn't loaded only if they are ALL black
           actually, not black but zero. each index in pixels[] is one of r,
           g, b, or a. if many of these are all zero, then it's highly
           likely our video hasn't loaded.

           idea: make this check continuously for n milliseconds after each
           keypress but no more than that, because the video is guaranteed
           to either be loaded or not loaded by then.
         */

        let allPixelsZero = true
        const pixelsToCheck = 2
        for (const i in Array.from({length: pixelsToCheck})) {
            const randomPixelIndex = int(random(scVideo.pixels.length))
            if (scVideo.pixels[randomPixelIndex] > 0) {
                allPixelsZero = false
                break
            }
        }

        /*  after a set number of milliseconds, stop checking the video pixels
            because it should have loaded by then */
        const VIDEO_LOAD_DELAY = 1000

        /* not every pixel checked is zero, which means the video likely
         loaded todo → these nested ifs can be made easier to understand */
        if (!allPixelsZero) { /* at least one non-zero pixel */
            imageMode(CORNER)
            image(scVideo, 0, 0, SF * 1056, SF * 720)
        } else if (millis() - lastKeypressMillis > VIDEO_LOAD_DELAY) {
            /* video not loaded and enough time has elapsed after our last
             keypress to enable a reasonable loading time */
            console.log(`[ INFO ] detected ${pixelsToCheck} randomly selected zero value pixels in scVideo.loadPixels() after ${VIDEO_LOAD_DELAY}ms; setting bgImage`)
            setBackgroundImage()
        }

        /* if scVideo is not initialized, load the background image by default
            required for the initial bgImage load when the page loads */
    } else if (scDefaultBg) {
        setBackgroundImage()
    }

    const LEFT_MARGIN = 10
    const BOTTOM_MARGIN = 10
    const PORTRAIT_Y = height - ABILITY_ICON_SIDE_LENGTH - BOTTOM_MARGIN

    /* display ability icon and ability letter overlay if loaded */
    if (scImgP)
        displayAbilityIconAndLetter(scImgP, 'P', LEFT_MARGIN, PORTRAIT_Y)

    if (scImgQ)
        displayAbilityIconAndLetter(scImgQ, 'Q', LEFT_MARGIN + 70, PORTRAIT_Y)

    if (scImgW)
        displayAbilityIconAndLetter(scImgW, 'W', LEFT_MARGIN + 140, PORTRAIT_Y)

    if (scImgE)
        displayAbilityIconAndLetter(scImgE, 'E', LEFT_MARGIN + 210, PORTRAIT_Y)

    if (scImgR)
        displayAbilityIconAndLetter(scImgR, 'R', LEFT_MARGIN + 280, PORTRAIT_Y)

    resetDcShadow()
}


function setBackgroundImage() {
    imageMode(CENTER)
    image(scDefaultBg, width/2, height/2, SF*1280, SF*720)
}


/* displays an ability icon and its associated letter */
function displayAbilityIconAndLetter(img, letter, x, y) {
    rectMode(CORNER)
    imageMode(CORNER)
    fill(0, 0, 255, 100)
    textFont(variableWidthFont, 24)

    /* we want to align the icons in the bottom left corner; 64 is icon side */
    const S = ABILITY_ICON_SIDE_LENGTH /* side length of square icon */
    const selectedOffsetY = -10

    /* translate ability icon and highlight ability letter if selected */
    if (selectedAbilityLetter === letter)
        y = y + selectedOffsetY

    setAbilityIconDcShadow()
    image(img, x, y)

    if (selectedAbilityLetter === letter)
        setAbilityLetterDcShadow()

    fill(0, 0, 0, 40)
    noStroke()

    const iconCenterX = x + S/2
    const iconCenterY = y + S/2
    const letterBoxMarginX = 2
    const letterBoxMarginY = 2
    const roundedCornerRadius = 5

    /* background ability letter rectangle centered in third 'quadrant' of
     ability icon, located bottom right of the center of the ability icon.
     todo → instead of centering in quadrant, consider padding from BRC
     */
    const P = 1 /* padding for border */
    if (selectedAbilityLetter === letter) {
        /* add white border */
        // stroke(48, 89, 85, 100) ← yellow
        stroke(0, 0, 75)
        strokeWeight(2)
        line(x-P, y-P, x+S+P, y-P) /* top line */
        line(x-P, y+S+P, x+S+P, y+S+P) /* bottom line */
        line(x-P, y-P, x-P, y+S+P) /* left */
        line(x+S+P, y-P, x+S+P, y+S+P) /* right */

    }

    fill(0, 0, 0, 40)
    noStroke()
    rect(
        iconCenterX + letterBoxMarginX,
        iconCenterY + letterBoxMarginY,
        S/2 - 2*letterBoxMarginX,
        S/2 - 2*letterBoxMarginY,
        roundedCornerRadius)

    /* icon box center is in bottom right ¾ of ability box */
    const letterBoxCenterX = iconCenterX + S*1/4
    const letterBoxCenterY = iconCenterY + S*1/4

    rectMode(CENTER)
    textAlign(CENTER, CENTER)
    fill(0, 0, 255, 100)
    const HACK_Y = 3 /* todo → text is not perfectly vertically centered */
    text(letter, letterBoxCenterX, letterBoxCenterY - HACK_Y)
}


/* black shadow for ability icons */
function setSelectedAbilityIconDcShadow() {
    dc.shadowBlur = 24
    dc.shadowColor = milk
}


/* black shadow for ability icons */
function setAbilityIconDcShadow() {
    dc.shadowBlur = 12
    dc.shadowColor = color(0, 0, 0)
}


function setAbilityLetterDcShadow() {
    dc.shadowBlur = 12
    dc.shadowColor = milk
}


function resetDcShadow() {
    dc.shadowBlur = 0
    dc.shadowOffsetY = 0
    dc.shadowOffsetX = 0
}

function displayTopCenteredAbilitiesAndVideo() {
    /* ability videos: default size 1056, 720 */
    if (scVideo) {
        const SF = 0.33
        image(scVideo, width/2+65, height/2+20, SF*1056, SF*720)
    }

    const H = height/6

    /** original icon layout: 600x450, centered top 1/3 */
    if (scImg)
        image(scImg, width/2 - 200, H)

    if (scImgP)
        image(scImgP, width/2 - 80, H)

    if (scImgQ)
        image(scImgQ, width/2, H)

    if (scImgW)
        image(scImgW, width/2 + 70, H)

    if (scImgE)
        image(scImgE, width/2 + 140, H)

    if (scImgR)
        image(scImgR, width/2 + 210, H)
}


function keyPressed() {
    lastKeypressMillis = millis()

    /* stop sketch */
    if (keyCode === 97) { /* numpad 1 */
        noLoop()
        instructions.html(`<pre>
            sketch stopped</pre>`)
    }

    if (key === 'z') { /* toggle debug corner visibility */
        debugCorner.visible = !debugCorner.visible
        console.log(`debugCorner visibility set to ${debugCorner.visible}`)
    }

    /* if key is PQWER, load selectedChampionVideo! maybe set abilityKey */
    if (key === 'p' || key === '1') {
        setAbilityVideoAndHTML('P')
        selectedAbilityLetter = 'P'
    }

    if (key === 'q') {
        setAbilityVideoAndHTML('Q')
        selectedAbilityLetter = 'Q'
    }

    if (key === 'w') {
        setAbilityVideoAndHTML('W')
        selectedAbilityLetter = 'W'
    }

    if (key === 'e') {
        setAbilityVideoAndHTML('E')
        selectedAbilityLetter = 'E'
    }

    if (key === 'r') {
        setAbilityVideoAndHTML('R')
        selectedAbilityLetter = 'R'
    }

    /* todo → add background cycling!
        ← → cycle skin backgrounds and skin name
     */
}


function mousePressed() {
    // console.log(`mouse pressed → ${scID}`)
}


/** fill local data! champions.JSON will have finished loading in preload() */
function processChampionsJSON(numChampions) {
    console.log(`[ INFO ] loaded ${numChampions} champions.json from ddragon.leagueoflegends`)
}


function gotSelectedChampionData(data) {
    scDataJSON = data['data']
    processSelectedChampion()
}


/* get champion data from meraki-analytics project, lolStaticData */
function gotLolStaticData(data) {
    scLsdJSON = data
    processLolStaticChampionData()
}


/* concurrent processing with processSelectedChampion for now
    goal is to convert psc to this method instead
 */
function processLolStaticChampionData() {
    console.log(`[ INFO ] process lolstaticdata → empty`)
    // console.log(`process wiki json → ${scID}`)
    // console.log(scLsdJSON[scID])
}


/** logs specific champion data
 needs loadJSON of champion-specific data to happen first
 → scDataJSON

 "type": "champion",
 "format": "standAloneComplex",
 "version": "12.12.1",
 "data": {
        "Quinn": {
            "id": "Quinn",
            "key": "133",
            "name": "Quinn",
            "title": "Demacia's Wings",
            "image": {},
            "skins": [],
            "lore": "",
            "blurb": "",
            "allytips": [],
            "enemytips": [],
            "tags": [],
            "partype": "Mana",
            "info": {},
            "stats": {},
            "spells": [],
            "passive": {},
            "recommended": []
        }
    }
 */
function processSelectedChampion() { /* from ddragon! */
    console.log(`[ INFO ] processing selected champion: ${scID}`)

    // logChampionAbilities()
    // logChampionTips()
    setChampionImages()

    /* load locally for now. this load must occur after ddragon json is
     loaded; otherwise scID is undef */
    loadJSON('champions.json', gotLolStaticData)
}



/** requires scDataJSON to be loaded */
function logChampionAbilities() {
    const data = scDataJSON[scID]

    console.log(`[ LOG ] ${scID}'s passive ability:`)
    console.log(data['passive'])
    // console.log(data['spells'])

    /* log the names of the selected champion's 4 abilities */
    const spellNumber = Object.keys(data['spells']).length

    console.log(`[ LOG ] ${scID}'s active abilities:`)
    const spells = data['spells']
    for (const spell of spells) {
        console.log(`${spell['id']}: ${spell['name']}`)
    }
}


/** requires scDataJSON to be loaded */
function logChampionTips() {
    const data = scDataJSON[scID]

    /* log ally tips */
    console.log(`[ LOG ] ${scID}'s ally tips:`)
    console.log(data['allytips'])

    console.log(`[ LOG ] ${scID}'s enemy tips:`)
    console.log(data['enemytips'])
}


/** creates tooltip text using ability data */
function logAbilityTooltip(tooltipData) {


    /*
        "tooltip": "Sejuani throws her True Ice bola, <status>Stunning</status>
        and revealing the first enemy champion hit for {{ e2 }} second and
        dealing <magicDamage>{{ minordamagetooltip }} magic
        damage</magicDamage> .<br /><br />If the bola travels at least 25%
        of its range, it <status>Stuns</status> and reveals for {{ e6 }}
        seconds instead. It then also creates an ice storm that
        <status>Slows</status> surrounding enemies by {{ e4 }}% for {{ e3 }}
        seconds. All affected enemies take <magicDamage>{{
        totaldamagetooltip }} magic damage</magicDamage>.
        {{ spellmodifierdescriptionappend }}",
     */

}


function getDdragonAbilityDesc(ddragonJSON, abilityLetter) {
    /** set short descriptions from ddragon;
     we use lolstaticdata for everything else!
     */

    /* QWER correspond to characters 0123, but P is different in ddragon */
    const dict = {
        'Q': 0,
        'W': 1,
        'E': 2,
        'R': 3,
    }

    const spells = ddragonJSON['spells']
    const abilityID = dict[abilityLetter] /* used for ddragon ability desc */
    let description

    if (abilityLetter === 'P') {
        /* abilityName = data['passive']['name'] ← ddragon */
        description = ddragonJSON['passive']['description']
    } else { /* key must be Q W E R */
        /* abilityName = spells[abilityID]['name'] ← ddragon*/
        description = spells[abilityID]['description']
    }

    return description
}


/* abilityLetter is ⊂ {P, Q, W, E, R} */
function setAbilityVideoAndHTML(abilityLetter) {
    /** start parsing lolstaticdata JSON */
    const abilityRoot = scLsdJSON[scID]['abilities']

    /* champions like Jayce have modal abilities, so we iterate through
        every abilityMode of each ability P, Q, W, E, and R
     */
    let fullAbilityText = '' /* desc text: covers the entirety of the ability */

    for (const abilityMode in abilityRoot[abilityLetter]) {
        const mode = abilityMode
        const abilityName = abilityRoot[abilityLetter][mode]['name']

        fullAbilityText += `<h1>${abilityName}</h1>`

        /* this returns a list of additional ability effects, which look like:
            Mana Restore → 6 / 8 / 10 / 12 / 14
            Total Magic Damage → 100 / 160 / 220 / 280 / 340 / 400 (+ 100% AP)

            see planning docs for JSON diagram
                → notes/2022.08.08 loadJson notes.jpeg
         */
        const abilityEffects = abilityRoot[abilityLetter][mode]['effects']
        for (const effect of abilityEffects) {
            fullAbilityText += effect['description'] + '<br>'

            /** 40/60/80/100/120 (+90% bonus AD) (+8% of target's maximum health)
             includes attributes like 'initial physical damage', 'slow', etc.
             each attribute is a name
             each attribute has 'modifiers' that include value,unit pairs

             @levelingElements: leveling [
             { attribute, modifiers [{ values:[], units:[]}, {..more}] }
             ,{..more}ⁿ
             ]
             */
            const levelingElements = effect['leveling']

            let abilityLevelingText = '' /* tier of effects → leveling [{}ⁿ] */
            for (const element of levelingElements) {
                /* modifiers, e.g. 60 / 95 / 130 / 165 / 200 (+ 50% AD) */
                const modifiers = element['modifiers']
                const attribute = element['attribute'] /* e.g. slow duration */

                abilityLevelingText += getAbilityEffectsString(attribute, modifiers)
            }

            fullAbilityText += `<div style="padding-left: 1em; padding-top: 0.25em">${abilityLevelingText}</div><br>`
        }

        /* add a horizontal rule for every ability except the last */
        if (mode !== Object.keys(abilityRoot[abilityLetter]).length - 1)
            fullAbilityText += '<hr>'
    }

    /** create video. output HTML to #instructions div; append with 'true' */
    displayDefaultInstructions()

    /* → old ddragon description which we no longer need
    let desc = getDdragonAbilityDesc(scDataJSON[scID], abilityLetter)
    div id="ddragonDesc">${desc}</div>
    */

    instructions.html(`<div id="lsdDescription">${fullAbilityText}</div>`, true)

    /**  video links for abilities look like this!
        https://d28xe8vt774jo5.cloudfront.net/champion-abilities/
        0103/ability_0103_P1.webm

        @uri the cloudfront video URI, keyed on ability letter
     */
    const uri = `${videoURI}${scKey}/ability_${scKey}_${abilityLetter}1.webm`
    scVideo = createVideo(uri)

    /* todo → sometimes passives don't have videos; this makes the
         background blank. can we detect the failure to load? */

    /*  by default video shows up in separate DOM element. hide it and draw
        it to the canvas instead

        todo → should we loadPixels here after a delay and set a flag so we
          don't have to loadPixels every frame?
          the delay can be done in a separate method that depends on a timestamp

          checkVideoPixels: take n random loadPixels indices and check if 0

            called with millis() as argument. maybe setTimeOut for 500ms
                → sets flag for scVideoLoaded

     */
    scVideo.hide()
    scVideo.play()
}


/**
 *
 * @param attribute attribute name string in:
 *      abilities → letter → effects → leveling → attribute + modifiers
 * @param modifiers the JSON array containing values and units for each
 *      attribute modifier
 */
function getAbilityEffectsString(attribute, modifiers) {
    /*  🏭→ iterate through all (value,units) pairs in levelingElements
        if values and units in leveling→modifiers are all identical
            display them once instead of with slash separators
                40/60/80/100/120
            each one a different color for scaling? scaling colors:
                'bonus' is bold
                AD → orange
                AP → indigo
                HP → green
                magic resistance → teal
     */

    let result = ''
    /* iterate through values and add units */
    for (const valueUnitIndex in modifiers) {
        /* assume non-empty values array and cache 1st value */
        const valueUnitsPair = modifiers[valueUnitIndex]
        const values = valueUnitsPair['values']
        const units = valueUnitsPair['units']
        const firstValue = values[0]
        const firstUnit = units[0]

        /** check if all values are identical;
         if identical, stringBuilder 40 / 60 / 80 / 100 / 120
         if not, (+90% bonus AD) (+8% of target's max hp)

         @result everything is compiled into one string
         */
        let valuesIdentical = true
        for (const value of values) {
            // console.log(`comparing ${value}, first:${firstValue}`)
            if (value !== firstValue) {
                valuesIdentical = false
                // console.log(`🔹 values not identical: ${attribute}`)
                break
            }
        }

        /* we must deal with unequal values with same units.
            avoid this: Headshot Damage Increase → 40 / 85 / 130 /
            175 / 220 40% bonus AD / 50% bonus AD / 60% bonus AD / 70%
            bonus AD / 80% bonus AD
            → but favor this: Headshot Damage Increase → 40 / 85 / 130 /
             175 / 220 (+ 40 / 50 / 60 / 70 / 80 % bonus AD)
            i.e. remove duplicate units if they're the same
        */
        let unitsIdentical = true
        for (const unit of units) {
            if (unit !== firstUnit) {
                unitsIdentical = false
                break
            }
        }

        let resultValues = ''
        if (valuesIdentical) {
            resultValues = firstValue
        } else { /* iterate through values to form 20/40/60/80/100 */
            for (const i in values) {
                let value = str(values[i])
                resultValues += value

                /* add '/ ' if we're not at the final item */
                if (int(i) !== Object.keys(values).length - 1)
                    resultValues += ' / '
            }
        }

        let resultUnits = ''
        if (unitsIdentical) { /* goal: (+ % AP) */
            resultUnits = firstUnit
        } else { /* units have to be the same */
            console.log('[ ERROR ] units not identical: ' + attribute)
        }

        let cssColorClass = ''

        /* todo → make this an object. '% AD': 'tooltip-AD'; iterate */
        let scalingStatsArray = {
            '% AD': 'tooltip-AD',
            '% bonus AD': 'tooltip-AD',
            '% AP': 'tooltip-AP',
            '% bonus AP': 'tooltip-AP',
            '% maximum health': 'tooltip-hp',
            '% bonus health': 'tooltip-hp'
        }

        let cssColorPrefix = ''
        let cssColorSuffix = ''

        if (resultUnits.includes('AD') ||
            resultUnits.includes('AP') ||
            resultUnits.includes('health') ||
            resultUnits.includes('magic resistance') ||
            resultUnits.includes('armor')) {

            if (resultUnits.includes('AD'))
                cssColorClass = 'tooltip-AD'

            if (resultUnits.includes('AP'))
                cssColorClass = 'tooltip-AP'

            if (resultUnits.includes('health'))
                cssColorClass = 'tooltip-hp'

            if (resultUnits.includes('magic resistance'))
                cssColorClass = 'tooltip-mr'

            if (resultUnits.includes('armor'))
                cssColorClass = 'tooltip-armor'

            cssColorPrefix = `<span class='${cssColorClass}'>`
            cssColorSuffix = `</span>`
        }

        /* todo → sometimes ability values are based on flat AD,
             e.g. Zed's R, PHYSICAL DAMAGE:
             65% AD (+ 25 / 40 / 55% of damage dealt)

             in this case we shouldn't '(+ )'
             solution: only add '(+ ' and ')' if we're not the first
             index, i.e. we are not modifiers['0'] / the first
             ValueUnit pair
         */
        let resultPrefix = ''
        let resultSuffix = ''

        if (int(valueUnitIndex) !== 0) {
            resultPrefix = '(+ '
            resultSuffix = ')'
        }

        result += `${cssColorPrefix}${resultPrefix}${resultValues}`
        result += `${resultUnits}${resultSuffix}${cssColorSuffix} `
    }

    return `<span class="abilityLevelingAttribute">${attribute}</span> → ${result}<br>`
}


function setChampionImages() {
    /* set champion image. example:
        https://ddragon.leagueoflegends.com/cdn/12.12.1/img/champion/Nunu.png

        → rootURI + 'img/champion/ID'
     */
    const imgPath = rootPatchURI + 'img/champion/' + scID + '.png'
    scImg = loadImage(imgPath)

    /* set champion passive image
        https://ddragon.leagueoflegends.com/cdn/12.12.1/img/passive/Ahri_SoulEater2.png

        → rootURI + 'img/passive/' + data['passive']['image']['full']
     */
    const data = scDataJSON[scID]
    const passiveURI = data['passive']['image']['full']
    const passivePath = rootPatchURI + 'img/passive/' + passiveURI;
    scImgP = loadImage(passivePath)

    /* set champion ability images: 64x64
        https://ddragon.leagueoflegends.com/cdn/12.12.1/img/spell/AhriSeduce.png
        → rootURI + 'img/spell/' + data['spells'][n]['image']['full]
     */
    scImgQ = loadImage(
        rootPatchURI + 'img/spell/' + data['spells']['0']['image']['full'])
    scImgW = loadImage(
        rootPatchURI + 'img/spell/' + data['spells']['1']['image']['full'])
    scImgE = loadImage(
        rootPatchURI + 'img/spell/' + data['spells']['2']['image']['full'])
    scImgR = loadImage(
        rootPatchURI + 'img/spell/' + data['spells']['3']['image']['full'])

    /* set default background
        skin splash screens → number at end corresponds to skin number.
        _0 is default
        https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_2.jpg

        "skins": [
            {
                "id": "20000",
                "num": 0,
                "name": "default",
                "chromas": false
            },
            {
                "id": "20001",
                "num": 1,
                "name": "Sasquatch Nunu & Willump",
                "chromas": false
            },
            ...
        ]
     */
    const bgPath = rootURI + 'img/champion/splash/' + scID + '_0.jpg'
    scDefaultBg = loadImage(bgPath)
}


/** returns ID of random champion selected from championsJSON
 → note that ID differs from name: Nunu's name is Nunu & Willump
 */
function getRandomChampionID(numChampions) {
    const randomHeroIndex = int(random(0, numChampions))
    const randomChampion = Object.keys(championsJSON['data'])[randomHeroIndex]
    return randomChampion
}


/** logs all champion names in the console */
function logChampionNames() {
    /*
        "type": "champion",
        "format": "standAloneComplex",
        "version": "12.12.1",
        "data": {
            "Nunu": {"id": "Nunu", "name": "Nunu & Willump", etc.},
            ...
        }
    */

    const data = championsJSON['data']
    const numChampions = Object.keys(data).length
    console.log(`[ INFO ] logging all ${numChampions} champion names`)

    for (const i in data) {
        console.log(data[i]['name'])
    }
}


/** 🧹 shows debugging info using text() 🧹 */
class CanvasDebugConsole {
    constructor(lines) {
        this.visible = false
        this.size = lines
        this.debugMsgList = [] /* initialize all elements to empty string */
        for (let i in lines)
            this.debugMsgList[i] = ''
    }

    setText(text, index) {
        if (index >= this.size) {
            this.debugMsgList[0] = `${index} ← index>${this.size} not supported`
        } else this.debugMsgList[index] = text
    }

    showBottom() {
        if (this.visible) {
            textFont(variableWidthFont, 14)

            const LEFT_MARGIN = 10
            const DEBUG_Y_OFFSET = height - 10 /* floor of debug corner */
            const LINE_SPACING = 2
            const LINE_HEIGHT = textAscent() + textDescent() + LINE_SPACING

            /* semi-transparent background */
            fill(0, 0, 0, 10)
            rectMode(CORNERS)
            const TOP_PADDING = 3 /* extra padding on top of the 1st line */
            rect(
                0,
                height,
                width,
                DEBUG_Y_OFFSET - LINE_HEIGHT * this.debugMsgList.length - TOP_PADDING
            )

            fill(0, 0, 100, 100) /* white */
            strokeWeight(0)

            for (let index in this.debugMsgList) {
                const msg = this.debugMsgList[index]
                text(msg, LEFT_MARGIN, DEBUG_Y_OFFSET - LINE_HEIGHT * index)
            }
        }
    }

    showTop() {
        if (this.visible) {
            textFont(fixedWidthFont, 14)

            const LEFT_MARGIN = 10
            const TOP_PADDING = 3 /* extra padding on top of the 1st line */

            /* offset from top of canvas */
            const DEBUG_Y_OFFSET = textAscent() + TOP_PADDING
            const LINE_SPACING = 2
            const LINE_HEIGHT = textAscent() + textDescent() + LINE_SPACING

            /* semi-transparent background, a console-like feel */
            fill(0, 0, 0, 10)
            rectMode(CORNERS)

            rect( /* x, y, w, h */
                0,
                0,
                width,
                DEBUG_Y_OFFSET + LINE_HEIGHT*this.debugMsgList.length/*-TOP_PADDING*/
            )

            fill(0, 0, 100, 100) /* white */
            strokeWeight(0)

            textAlign(LEFT)
            for (let i in this.debugMsgList) {
                const msg = this.debugMsgList[i]
                text(msg, LEFT_MARGIN, LINE_HEIGHT*i + DEBUG_Y_OFFSET)
            }
        }
    }
}