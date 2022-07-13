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
 ☐ cycle through abilities
 ☐ look up using the DOM with daniel
 ☐ add icons
 ☐ create '0000' string padding function
 ☐ add videos per ability

 */

let font
let instructions
let debugCorner /* output debug text in the bottom left corner of the canvas */

let rootURI = 'https://ddragon.leagueoflegends.com/cdn/12.13.1/data/en_US/'
let allChampionsPath = 'champion.json'
let specificChampionPath

let championsJSON
let specificChampionJSON /* loaded after setup */
let n /* number of champions */

function preload() {
    font = loadFont('data/consola.ttf')
    let req = rootURI + allChampionsPath
    championsJSON = loadJSON(req)
}


function setup() {
    let cnv = createCanvas(600, 300)
    cnv.parent('#canvas')
    colorMode(HSB, 360, 100, 100, 100)
    textFont(font, 14)

    /* initialize instruction div */
    instructions = select('#ins')
    instructions.html(`<pre>
        numpad 1 → freeze sketch</pre>`)

    debugCorner = new CanvasDebugCorner(5)

    processChampionsJSON()
    // logChampionNames()
    getRandomChampionName()
}


/** fill local data! champions.JSON will have finished loading in preload() */
function processChampionsJSON() {
    const data = championsJSON['data']
    n = Object.keys(data).length
    console.log(`[ INFO ] loaded ${n} champions.json from ddragon.leagueoflegends`)


}


/** logs specific champion data. needs loadJSON of champion-specific data  */
function logRandomChampionData() {

}


function getRandomChampionName() {
    const randomHeroIndex = int(random(0, n))
    const randomChampion = Object.keys(championsJSON['data'])[randomHeroIndex]
    console.log(`${randomChampion}`)
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