import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import LightButton from "../widgets/LightButton";
import Widget from "../../../lib/ui/Widget";

export default class InteractionTopControl extends GameMapControl {
    body: Widget = null

    constructor(public _config: {
        name: String,
        cancel_handler?: () => void
    }) {
        super({
            type: "gapless",
            position: "top-center"
        });

        this.content.addClass("ctr-interaction-control")

        let header_row = c("<div class='ctr-interaction-control-header'></div>").appendTo(this.content)

        header_row.append(c().text(`Active interaction: ${_config.name}`))
        header_row.append(c("<div style='flex-grow: 1; min-width: 20px'>"))

        if (this._config.cancel_handler) {
            header_row.append(c("<div class='ctr-interaction-control-header-close'>&times;</div>").tapRaw(r => r.on("click", () => {
                this._config.cancel_handler()
            })))
        }
    }

    setContent(widget: Widget): this {
        if (this.body) {
            this.body.remove()
            this.body = null
        }

        if (widget) {
            widget.appendTo(this.content)
            this.body = widget
        }

        return this
    }

    setText(text: string): this {
        return this.setContent(c().text(text))
    }
}