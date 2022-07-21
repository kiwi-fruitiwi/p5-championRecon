/**
 @author kiwi
 @date 2022.07.14

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

 ☐ log basic info
    +stats
 ☒ output abilities and tips
 ☒ output champion image
 ☒ output passive image
 ☒ output 4 ability images
 ☒ add random video as canvas element

 ☐ create '0000' string padding function

 ☐ add videos per ability

 ☐ switch champions with numpad +/- one and ten. debug log number
 ☐ look up using the DOM with daniel
 ☐ visualize stats like AD growth or armor growth. comparison to other champions
 */

let font
let instructions
let debugCorner /* output debug text in the bottom left corner of the canvas */

const rootURI = 'https://ddragon.leagueoflegends.com/cdn/12.13.1/'
const rootLangURI = rootURI + 'data/en_US/'
const allChampionsPath = 'champion.json'
const videoURI = 'https://d28xe8vt774jo5.cloudfront.net/champion-abilities/'

let championsJSON
let selectedChampionJsonURI /* loaded after setup */
let selectedChampionID /* id of champion after loading specific champion json */
let selectedChampionImg
let selectedChampionP /* passive ability image */
let selectedChampionQ
let selectedChampionW
let selectedChampionE
let selectedChampionR

let selectedChampionVideoR

/* the value of the key 'data' in the specific champion json */
let selectedChampionDataJSON

let n /* number of champions */

function preload() {
    font = loadFont('data/consola.ttf')
    let req = rootLangURI + allChampionsPath
    championsJSON = loadJSON(req)
}


function setup() {
    let cnv = createCanvas(600, 450)
    cnv.parent('#canvas')

    imageMode(CENTER)
    colorMode(HSB, 360, 100, 100, 100)
    textFont(font, 14)

    /* initialize instruction div */
    instructions = select('#ins')
    instructions.html(`<pre>
        numpad 1 → freeze sketch</pre>`)

    debugCorner = new CanvasDebugCorner(5)

    /* how many total champions are there? */
    n = Object.keys(championsJSON['data']).length

    processChampionsJSON()
    // logChampionNames()

    selectedChampionID = getRandomChampionID()
    selectedChampionJsonURI = `${rootLangURI}champion/${selectedChampionID}.json`
    loadJSON(selectedChampionJsonURI, gotChampionData)

}


/** fill local data! champions.JSON will have finished loading in preload() */
function processChampionsJSON() {
    console.log(`[ INFO ] loaded ${n} champions.json from ddragon.leagueoflegends`)
}


function gotChampionData(data) {
    const d = data['data']
    selectedChampionDataJSON = d
    
    processSelectedChampion()
}


/** logs specific champion data
    needs loadJSON of champion-specific data to happen first
        → selectedChampionDataJSON

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
function processSelectedChampion() {
    console.log(`[ INFO ] processing selected champion: ${selectedChampionID}`)

    const data = selectedChampionDataJSON[selectedChampionID]

    console.log(`[ LOG ] ${selectedChampionID}'s passive ability:`)
    console.log(data['passive'])
    // console.log(data['spells'])

    /* log the names of the selected champion's 4 abilities */
    const spellNumber = Object.keys(data['spells']).length

    console.log(`[ LOG ] ${selectedChampionID}'s active abilities:`)
    const spells = data['spells']
    for (const spell of spells) {
        console.log(`${spell['id']} + ${spell['name']}`)
    }

    /* log ally tips */
    console.log(`[ LOG ] ${selectedChampionID}'s ally tips:`)
    console.log(data['allytips'])

    console.log(`[ LOG ] ${selectedChampionID}'s enemy tips:`)
    console.log(data['enemytips'])

    setChampionImages()

    selectedChampionVideoR = createVideo(videoURI + '0103/ability_0103_R1.webm')

    /*  by default video shows up in separate DOM element. hide it and draw
        it to the canvas instead */
    selectedChampionVideoR.hide()
}


function mousePressed() {
    selectedChampionVideoR.play()
}


function setChampionImages() {
    /* set champion image. example:
        https://ddragon.leagueoflegends.com/cdn/12.12.1/img/champion/Nunu.png

        → rootURI + 'img/champion/ID'
     */
    const imgPath = rootURI + 'img/champion/' + selectedChampionID + '.png'
    selectedChampionImg = loadImage(imgPath)

    /* set champion passive image
        https://ddragon.leagueoflegends.com/cdn/12.12.1/img/passive/Ahri_SoulEater2.png

        → rootURI + 'img/passive/' + data['passive']['image']['full']
     */
    const data = selectedChampionDataJSON[selectedChampionID]
    const passiveURI = data['passive']['image']['full']
    const passivePath = rootURI + 'img/passive/' + passiveURI;
    selectedChampionP = loadImage(passivePath)

    /* set champion ability images
        https://ddragon.leagueoflegends.com/cdn/12.12.1/img/spell/AhriSeduce.png
        → rootURI + 'img/spell/' + data['spells'][n]['image']['full]
     */
    selectedChampionQ = loadImage(
        rootURI + 'img/spell/' + data['spells']['0']['image']['full'])
    selectedChampionW = loadImage(
        rootURI + 'img/spell/' + data['spells']['1']['image']['full'])
    selectedChampionE = loadImage(
        rootURI + 'img/spell/' + data['spells']['2']['image']['full'])
    selectedChampionR = loadImage(
        rootURI + 'img/spell/' + data['spells']['3']['image']['full'])
}


/** returns ID of random champion selected from championsJSON
    → note that ID differs from name: Nunu's name is Nunu & Willump
 */
function getRandomChampionID() {
    const randomHeroIndex = int(random(0, n))
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


function draw() {
    background(234, 34, 24)

    /* debugCorner needs to be last so its z-index is highest */
    debugCorner.setText(`frameCount: ${frameCount}`, 2)
    debugCorner.setText(`fps: ${frameRate().toFixed(0)}`, 1)
    debugCorner.show()

    const H = height/6

    if (selectedChampionImg)
        image(selectedChampionImg, width/2 - 200, H)

    if (selectedChampionP)
        image(selectedChampionP, width/2 - 80, H)

    if (selectedChampionQ)
        image(selectedChampionQ, width/2, H)

    if (selectedChampionW)
        image(selectedChampionW, width/2 + 70, H)

    if (selectedChampionE)
        image(selectedChampionE, width/2 + 140, H)

    if (selectedChampionR)
        image(selectedChampionR, width/2 + 210, H)

    /* ability videos: default size 1056, 720 */
    if (selectedChampionVideoR) {
        // console.log(selectedChampionVideoR)
        const SF = 0.25
        image(selectedChampionVideoR, width/2+35, height/2+20, SF*1056, SF*720)
    }

    if (frameCount > 3000)
        noLoop()
}


function keyPressed() {
    /* stop sketch */
    if (keyCode === 97) { /* numpad 1 */
        noLoop()
        instructions.html(`<pre>
            sketch stopped</pre>`)
    }
}


/** 🧹 shows debugging info using text() 🧹 */
class CanvasDebugCorner {
    constructor(lines) {
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

    show() {
        textFont(font, 14)

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
            DEBUG_Y_OFFSET - LINE_HEIGHT*this.debugMsgList.length - TOP_PADDING
        )

        fill(0, 0, 100, 100) /* white */
        strokeWeight(0)

        for (let index in this.debugMsgList) {
            const msg = this.debugMsgList[index]
            text(msg, LEFT_MARGIN, DEBUG_Y_OFFSET - LINE_HEIGHT * index)
        }
    }
}