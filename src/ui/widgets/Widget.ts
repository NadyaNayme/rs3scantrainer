import {TypedEmitter} from "../../skillbertssolver/eventemitter";
import * as events from "events";
import {Browser} from "leaflet";
import * as tippy from 'tippy.js';


export default class Widget<T extends Record<string, any> = {}> extends TypedEmitter<T> {
    constructor(public container: JQuery = $("<div>")) {
        super()

        if (!container) this.container = $("<div>")
    }

    empty(): this {
        this.container.empty()
        return this
    }

    appendTo(widget: Widget | JQuery): this {
        if (widget instanceof Widget) widget = widget.container

        widget.append(this.container)

        return this
    }

    append(widget: Widget | JQuery): this {
        if (widget instanceof Widget) widget = widget.container

        this.container.append(widget)

        return this
    }

    css(key: string, value: string): this {
        this.container.css(key, value)

        return this
    }

    css2(properties: JQuery.PlainObject<string | number>): this {
        this.container.css(properties)

        return this
    }

    tooltip(title: string): this {
        this.container.attr("title", title)
        return this
    }

    remove(): this {
        this.container.remove()
        return this
    }

    addClass(cls: string): this {
        this.container.addClass(cls)
        return this
    }

    static wrap<T extends Record<string, any> = {}>(jquery: JQuery | string): Widget<T> {
        if (typeof jquery == "string") jquery = $(jquery)

        return new Widget<T>(jquery)
    }

    text(text: string | number): this {
        this.container.text(text.toString())
        return this
    }

    setVisible(visible: boolean): this {
        if (visible) this.container.show()
        else this.container.hide()

        return this
    }

    toggleClass(cls: string, value: boolean = null): this {
        if (value == null) value = !this.container.hasClass(cls)

        if (value) this.container.addClass(cls)
        else this.container.removeClass(cls)

        return this
    }

    tapRaw(f: (j: JQuery) => any): this {
        f(this.container)

        return this
    }

    addTippy(tooltip: Widget, options: Partial<tippy.Props> = {}): this {
        tippy.default(this.container.get()[0], {
            ...options,
            content: c("<div style='background: rgb(10, 31, 41); border: 2px solid white'></div>").append(tooltip).container.get()[0],
            arrow: true,
            delay: 1,
        })

        return this
    }
}

declare global {
    function c(s?: string): Widget
}

globalThis.c = (s: string = "<div>") => Widget.wrap(s)
