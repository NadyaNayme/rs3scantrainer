import {TileCoordinates} from "./coordinates";
import {TileRectangle} from "./coordinates";
import {GieliCoordinates} from "./coordinates";

export namespace Clues {
    export function digSpotArea(spot: TileCoordinates): TileRectangle {
        return {
            topleft: {x: spot.x - 1, y: spot.y + 1},
            botright: {x: spot.x + 1, y: spot.y - 1},
            level: spot.level
        }
    }
}

export type ClueTier = "easy" | "medium" | "hard" | "elite" | "master"

export namespace ClueTier {
    export const all: ClueTier[] = ["easy", "medium", "hard", "elite", "master"]
}

export type ClueType =
    "anagram"
    | "compass"
    | "coordinates"
    | "cryptic"
    | "emote"
    | "map"
    | "scan"
    | "simple"
    | "skilling"

export namespace ClueType {
    export function meta(x: ClueTier | ClueType) {
        let lut: Record<ClueType | ClueTier, {
            icon_url: string
        }> = {
            easy: {icon_url: "assets/icons/sealedeasy.png"},
            medium: {icon_url: "assets/icons/sealedmedium.png"},
            hard: {icon_url: "assets/icons/sealedhard.png"},
            elite: {icon_url: "assets/icons/sealedelite.png"},
            master: {icon_url: "assets/icons/sealedmaster.png"},
            anagram: {icon_url: "assets/icons/activeclue.png"},
            compass: {icon_url: "assets/icons/arrow.png"},
            coordinates: {icon_url: "assets/icons/sextant.png"},
            cryptic: {icon_url: "assets/icons/activeclue.png"},
            emote: {icon_url: "assets/icons/emotes.png"},
            map: {icon_url: "assets/icons/map.png"},
            scan: {icon_url: "assets/icons/scan.png"},
            simple: {icon_url: "assets/icons/activeclue.png"},
            skilling: {icon_url: "assets/icons/activeclue.png"}
        }

        if (!lut[x]) debugger

        return lut[x]
    }

    export function pretty(x: ClueTier | ClueType) {
        if (!x) return ""
        return x.charAt(0).toUpperCase() + x.slice(1);
    }

    export const all: ClueType[] = ["anagram", "compass", "coordinates", "cryptic", "emote", "map", "scan", "simple", "skilling"]
}

export namespace Clues {
    export type Challenge =
        { type: "wizard" } |
        { type: "slider" } |
        { type: "celticknot" } |
        { type: "lockbox" } |
        { type: "towers" } |
        { type: "challengescroll", question: string, answers: { answer: number, note?: string }[] }

    export type Solution = Solution.TalkTo | Solution.Dig | Solution.Search

    namespace Solution {
        // The area for npcs should include all tiles they can be talked to from, so one tile bigger than their wander range
        export type TalkTo = { type: "talkto", spots: { range: TileRectangle, note?: string }[], npc: string }
        export type Dig = { type: "dig", spot: TileCoordinates }
        export type Search = { type: "search", spot: TileCoordinates, key?: { instructions: string, area: TileRectangle } }
    }

    type StepShared = {
        id: number,
        type: ClueType,
        tier: ClueTier,
        text: string[],
        challenge?: Challenge[]
    }

    export type Anagram = StepShared & { type: "anagram", solution: Solution.TalkTo }
    export type Compass = StepShared & { type: "compass", spots: TileCoordinates[] }
    export type Coordinate = StepShared & { type: "coordinates", coordinates: GieliCoordinates }
    export type Cryptic = StepShared & { type: "cryptic", solution: Solution }
    export type Emote = StepShared & {
        type: "emote",
        area: TileRectangle,
        items: string[],
        emotes: string[],
        double_agent: boolean,
        hidey_hole?: { location: TileRectangle, name: string }
    }
    export type Map = StepShared & { type: "map", ocr_data: number[], solution: Solution, image_url: string }
    export type Scan = StepShared & { type: "scan", scantext: string, range: number, spots: TileCoordinates[] }
    export type Simple = StepShared & { type: "simple", solution: Solution }

    export type Step = Anagram | Compass | Coordinate | Cryptic | Emote | Map | Scan | Simple

    export type ScanStep = Scan
}