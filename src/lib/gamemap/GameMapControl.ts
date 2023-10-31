import Widget from "../ui/Widget";
import GameLayer from "./GameLayer";
import {GameMap} from "./GameMap";

export namespace GameMapControl {
    export type position_t =
        "top-center" | "top-left" | "top-right" |
        "bottom-center" | "bottom-left" | "bottom-right" |
        "left-center" | "left-top" | "left-bottom" |
        "right-center" | "right-top" | "right-bottom"

    export type config_t = {
        position: position_t,
        type: "gapless" | "floating",
        no_default_styling?: boolean
    }
}

export class GameMapControl extends GameLayer {
    parent: GameLayer | null = null

    constructor(public config: GameMapControl.config_t,
                public content: Widget = c()) {
        super()

        if (!this.config.no_default_styling)
            this.content.addClass("gamemap-ui-control-default-styling")

        switch (this.config.type) {
            case "gapless":
                this.content.addClass("gamemap-ui-control-gapless")
                break;
            case "floating":
                this.content.addClass("gamemap-ui-control-floating")
                break;
        }

        // Disable events propagating to the map // TODO: Do I really need this?
        this.content.container.on("blur change click dblclick error focus focusin focusout hover keydown keypress keyup load mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup resize select submit mousewheel", (e) => e.stopPropagation())
    }
    onAdd(map: GameMap) {
        map.addControl(this)

        return super.onAdd(map)
    }


    onRemove(map: GameMap): this {
        this.content.detach()

        return super.onRemove(map);
    }
}

