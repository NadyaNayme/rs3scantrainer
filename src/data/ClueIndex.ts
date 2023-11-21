import {ClueStep} from "../lib/runescape/clues";
import {clues} from "./clues";
import {Lazy} from "../lib/properties/Lazy";

export class ClueIndex<T extends object = {}> {
    private data: ({ clue: ClueStep } & T)[]

    constructor(init: () => T) {
        this.data = Array(ClueIndex.max_id.get())

        clues.forEach(c => {
            this.data[c.id] = {clue: c, ...init()}
        })
    }

    static new<T extends object = {}>(init: () => T) {

    }

    filtered(): ({ clue: ClueStep } & T)[] {
        return this.data.filter(c => !!c)
    }

    static simple(): ClueIndex {
        return new ClueIndex(() => ({}))
    }
}

export namespace ClueIndex {
    export const max_id = new Lazy<number>(() => Math.max(...clues.map(c => c.id)))

}