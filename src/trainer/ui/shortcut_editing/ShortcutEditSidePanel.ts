import {SidePanel} from "../SidePanelControl";
import Widget from "lib/ui/Widget";
import {Shortcuts} from "lib/runescape/shortcuts";
import SmallImageButton from "../widgets/SmallImageButton";
import Properties from "../widgets/Properties";
import TextField from "lib/ui/controls/TextField";
import LightButton from "../widgets/LightButton";
import ExportStringModal from "../widgets/modals/ExportStringModal";
import InteractionSelect from "../pathedit/InteractionSelect";
import NumberInput from "lib/ui/controls/NumberInput";
import MapCoordinateEdit from "../widgets/MapCoordinateEdit";
import {DropdownSelection} from "../widgets/DropdownSelection";
import * as lodash from "lodash"
import {Rectangle, Vector2} from "lib/math";
import {floor_t} from "lib/runescape/coordinates";
import GameMapDragAction from "lib/gamemap/interaction/GameMapDragAction";
import {ShortcutViewLayer} from "./ShortcutView";
import {InteractionGuard} from "lib/gamemap/interaction/InteractionLayer";
import SelectTileInteraction from "lib/gamemap/interaction/SelectTileInteraction";
import InteractionTopControl from "../map/InteractionTopControl";
import {DrawOffset} from "./interactions/DrawOffset";
import {TileRectangle} from "../../../lib/runescape/coordinates";
import {TileCoordinates} from "../../../lib/runescape/coordinates";
import {util} from "../../../lib/util/util";
import {ewent, Observable, ObservableArray, observe} from "../../../lib/reactive";
import shortcuts from "../../../data/shortcuts";
import * as assert from "assert";
import Checkbox from "../../../lib/ui/controls/Checkbox";
import ObservableArrayValue = ObservableArray.ObservableArrayValue;
import {DrawDoor} from "./interactions/DrawDoor";
import {direction} from "../../../lib/runescape/movement";
import {C} from "../../../lib/ui/constructors";
import hbox = C.hbox;
import vbox = C.vbox;
import span = C.span;

class ShortcutEdit extends Widget {
    centered = ewent<Shortcuts.shortcut>()

    private header: Widget
    private body: Widget

    constructor(public value: ObservableArray.ObservableArrayValue<Shortcuts.shortcut & { is_builtin: boolean }>,
                private associated_preview: ShortcutViewLayer.ShortcutPolygon,
                private interaction_guard: InteractionGuard) {
        super(vbox());

        this.init(vbox(
            this.header = vbox(),
            this.body = vbox().css("display", "none")
        )).addClass("ctr-shortcut-edit")

        value.subscribe(() => this.render(), true)
    }

    private render() {
        this.header.empty()
        this.body.empty()

        c("<div class='ctr-shortcut-edit-header'></div>")
            .append(c().text(this.value.value().name))
            .append(c("<div style='flex-grow: 1'></div>"))
            .append(SmallImageButton.new("assets/icons/fullscreen.png")
                .on("click", () => this.centered.trigger(this.value.value())))
            .append(SmallImageButton.new("assets/icons/delete.png")
                .on("click", () => this.value.remove())
                .setEnabled(!this.value.value().is_builtin))
            .appendTo(this.header)
            .tapRaw(r => r.on("click", () => this.body.container.animate({"height": "toggle"})))

        let props = new Properties()

        let v = this.value.value()

        props.named("Name", new TextField()
            .setValue(v.name)
            .on("changed", v => {
                this.value.update(o => o.name = v)
            }))

        switch (v.type) {
            case "door": {
                let width = v.direction == "eastwest"
                    ? Rectangle.tileHeight(v.area)
                    : Rectangle.tileWidth(v.area)

                let dir = v.direction == "eastwest"
                    ? "|"
                    : "&#8212;"

                props.named("Bounds",
                    c("<div style='display: flex'></div>")
                        .append(c("<span style='margin-right: 5px;'></span>").setInnerHtml(`${width} wide ${dir} door at ${v.area.topleft.x}|${v.area.botright.y}`))
                        .append(c().css("flex-grow", "1"))
                        .append(
                            new LightButton("Select")
                                .on("click", () => {
                                    this.interaction_guard.set(
                                        new DrawDoor({
                                            done_handler: (new_v) => {
                                                this.value.update(() => {
                                                    assert(v.type == "door")
                                                    v.area = new_v.area
                                                    v.direction = new_v.direction
                                                })
                                            }
                                        }).onStart(() => {
                                            this.associated_preview?.setOpacity(0)
                                        }).onEnd(() => {
                                            this.associated_preview?.setOpacity(1)
                                        }).attachTopControl(new InteractionTopControl().setName("Selecting interactive area").setText("Click and drag a rectangle around the area where this interaction can be triggered from."))
                                    )
                                })))

            }
                break;
            case "entity": {
                props.named("Click-Area",
                    c("<div style='display: flex'></div>")
                        .append(c("<span style='margin-right: 5px;'></span>").text(`${Rectangle.width(v.clickable_area)}x${Rectangle.height(v.clickable_area)} at ${v.clickable_area.topleft.x}|${v.clickable_area.botright.y}`))
                        .append(c().css("flex-grow", "1"))
                        .append(
                            new LightButton("Select")
                                .on("click", () => {
                                    this.interaction_guard.set(
                                        new GameMapDragAction({
                                            preview_render: (area) => {
                                                assert(v.type == "entity")

                                                return ShortcutViewLayer.render_clickable(Rectangle.extend(area, 0.5), v.actions[0]?.cursor || "generic")
                                            }
                                        }).onStart(() => {
                                            this.associated_preview?.config?.update(c => c.draw_clickable = false)
                                        }).onEnd(() => {
                                            this.associated_preview?.config?.update(c => c.draw_clickable = true)
                                        }).onCommit(a => {
                                            this.value.update(v => {
                                                assert(v.type == "entity")
                                                v.clickable_area = TileRectangle.extend(a, 0.5)
                                            })
                                        }).attachTopControl(new InteractionTopControl().setName("Selecting clickable area").setText("Click and drag a rectangle around the area that is clickable for this entity."))
                                    )
                                }))
                )

                for (let action of v.actions) {
                    props.row(
                        c("<div style='display: flex'></div>")
                            .append(c(`<div class='nisl-property-header' style="flex-grow: 1">${action.name}</div>`))
                            .append(SmallImageButton.new("assets/icons/delete.png")
                                .on("click", () => {
                                    this.value.update(v => {
                                        assert(v.type == "entity")
                                        v.actions.splice(v.actions.indexOf(action), 1)
                                    })
                                })))

                    props.named("Name", new TextField()
                        .setValue(action.name)
                        .on("changed", v => {
                            this.value.update(() => action.name = v)
                        }))

                    props.named("Cursor", new InteractionSelect()
                        .setValue(action.cursor)
                        .on("selection_changed", (v) => {
                            this.value.update(() => action.cursor = v)
                        })
                    )
                    props.named("Ticks", new NumberInput(0, 100)
                        .setValue(action.time)
                        .on("changed", (v) => this.value.update(() => action.time = v))
                    )
                    props.named("Area",
                        c("<div style='display: flex'></div>")
                            .append(c("<span style='margin-right: 5px;'></span>").text(`${Rectangle.tileWidth(action.interactive_area)}x${Rectangle.tileHeight(action.interactive_area)} at ${action.interactive_area.topleft.x}|${action.interactive_area.botright.y}`))
                            .append(c().css("flex-grow", "1"))
                            .append(
                                new LightButton("Select")
                                    .on("click", () => {
                                        this.interaction_guard.set(
                                            new GameMapDragAction({
                                                preview_render: (area) => ShortcutViewLayer.render_interactive_area(area)
                                            }).onStart(() => {
                                                this.associated_preview?.config?.update(c => c.hidden_actions.push(action))
                                            }).onEnd(() => {
                                                this.associated_preview?.config?.update(c => c.hidden_actions = c.hidden_actions.filter(x => x != action))
                                            }).onCommit(a => {
                                                this.value.update(() => action.interactive_area = a)
                                            }).attachTopControl(new InteractionTopControl().setName("Selecting interactive area").setText("Click and drag a rectangle around the area where this interaction can be triggered from."))
                                        )
                                    })))
                    props.named("Targeting", new DropdownSelection<"offset" | "fixed">({
                            type_class: {
                                toHTML: (v: string) => c().text(lodash.capitalize(v))
                            }
                        }, ["offset", "fixed"])
                            .setValue(action.movement.type)
                            .on("selection_changed", (v) => {
                                switch (v) {
                                    case "offset": {
                                        this.value.update(() => {
                                            if (action.movement.type == "fixed") {
                                                action.movement = {
                                                    type: "offset",
                                                    offset: {...Vector2.sub(action.movement.target, Rectangle.center(action.interactive_area)), level: action.movement.target.level}
                                                }
                                            }
                                        })
                                        break;
                                    }
                                    case "fixed": {
                                        this.value.update(() => {
                                            if (action.movement.type == "offset") {
                                                action.movement = {
                                                    type: "fixed",
                                                    target: TileCoordinates.lift(
                                                        Vector2.add(action.movement.offset, Rectangle.center(action.interactive_area)),
                                                        floor_t.clamp(action.interactive_area.level + action.movement.offset.level)
                                                    ),
                                                    relative: true
                                                }
                                            }
                                        })

                                        break;
                                    }
                                }
                            })
                    )

                    switch (action.movement.type) {
                        case "offset":
                            props.named("Offset",
                                c("<div style='display: flex'></div>")
                                    .append(c("<span style='margin-right: 5px;'></span>")
                                        .text(`${action.movement.offset.x}|${action.movement.offset.y}, Level ${util.signedToString(action.movement.offset.level)}`)
                                    )
                                    .append(c().css("flex-grow", "1"))
                                    .append(
                                        new LightButton("Draw")
                                            .on("click", () => {

                                                this.interaction_guard.set(
                                                    new DrawOffset()
                                                        .onCommit((v) => {
                                                            this.value.update(() => {
                                                                if (action.movement.type == "offset") {
                                                                    action.movement.offset = {...v.offset, level: v.level_offset}
                                                                }
                                                            })
                                                        })
                                                )
                                            })
                                    ))
                            break

                        case "fixed":
                            let target_thing = c()

                            target_thing.append(new MapCoordinateEdit(
                                    action.movement.target,
                                    () => this.interaction_guard.set(new SelectTileInteraction({
                                            preview_render: (target) => ShortcutViewLayer.render_transport_arrow(Rectangle.center(action.interactive_area, true), target)
                                        }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText("Select the target of this map connection."))
                                    )).on("changed", (v) => {
                                    this.value.update(() => {
                                        if (action.movement.type == "fixed") action.movement.target = v
                                    })
                                })
                            )

                            target_thing.append(C.hbox(
                                    new Checkbox().setValue(action.movement.relative)
                                        .on("changed", (v) => {
                                            this.value.update(() => {
                                                assert(action.movement.type == "fixed")
                                                action.movement.relative = v
                                            })
                                        }),
                                    C.span("Relative to shortcut?").tooltip("If checked, the target will move and rotate with the shortcut.")
                                )
                            )

                            props.named("Target", target_thing)

                            break
                    }


                    let orientation_dropdown = new DropdownSelection<Shortcuts.shortcut_orientation_type>({
                        type_class: {
                            toHTML: (v: Shortcuts.shortcut_orientation_type) => {
                                switch (v.type) {
                                    case "byoffset":
                                        return span("By movement vector")
                                    case "toentity":
                                        return span("Turn to entity")
                                    case "keep":
                                        return span("Keep previous")
                                    case "forced":
                                        return span(`Force ${direction.toString(v.direction)}`)
                                    default:
                                        return span("")
                                }
                            }
                        }
                    }, [
                        {type: "keep"},
                        {type: "byoffset"},
                        {type: "toentity"},
                    ].concat(direction.all.map(d => ({
                            type: "forced",
                            relative: false,
                            direction: d
                        })
                    )) as Shortcuts.shortcut_orientation_type[])
                        .on("selection_changed", (v) => {
                            this.value.update(() => {
                                if (v.type == "forced") {
                                    let old_relative = action.orientation.type == "forced"
                                        ? action.orientation.relative
                                        : true
                                    action.orientation = {...v, relative: old_relative}
                                } else {
                                    action.orientation = v
                                }
                            })
                        })
                        .setValue(action.orientation)

                    props.named("Orientation",
                        vbox(
                            orientation_dropdown,
                            action.orientation.type != "forced"
                                ? undefined
                                : hbox(new Checkbox().setValue(action.orientation.relative)
                                        .on("changed", (v) => {
                                            this.value.update(() => {
                                                assert(action.orientation.type == "forced")
                                                action.orientation.relative = v
                                            })
                                        }),
                                    C.span("Relative to shortcut?").tooltip("If checked, the forced direction will rotate with the shortcut.")
                                )
                        ))
                }

                props.row(vbox(new LightButton("+ Add Action")
                    .on("click", () => {
                        this.value.update(v => {
                            assert(v.type == "entity")

                            v.actions.push({
                                    cursor: v.actions[0]?.cursor || "generic",
                                    interactive_area: TileRectangle.extend(v.clickable_area, 0.5),
                                    movement: {type: "offset", offset: {x: 0, y: 0, level: v.clickable_area.level}},
                                    orientation: {type: "keep"},
                                    name: v.actions[0]?.name || "Use",
                                    time: v.actions[0]?.time || 3
                                }
                            )
                        })
                    })).css("text-align", "center"))


                break;
            }
        }

        props.appendTo(this.body)
    }
}

export default class ShortcutEditSidePanel extends SidePanel {
    search_container: Widget
    result_container: Widget
    viewport_checkbox: Checkbox

    centered = ewent<Shortcuts.shortcut>()

    private visible_data_view: Observable<ObservableArrayValue<Shortcuts.shortcut & { is_builtin: boolean }>[]>
    private search_term = observe("")

    widgets: ShortcutEdit[] = []

    constructor(private data: ObservableArray<Shortcuts.shortcut & { is_builtin: boolean }>,
                private view_layer: ShortcutViewLayer,
                private interaction_guard: InteractionGuard) {
        super();

        observe<(_: Shortcuts.shortcut) => boolean>(() => true).equality(() => false)

        this.view_layer.getMap().viewport.subscribe(() => this.updateVisibleData())
        this.search_term.subscribe(() => this.updateVisibleData())

        this.search_container = c().appendTo(this)

        this.visible_data_view = observe(data.value())

        c("<div style='text-align: center'></div>")
            .append(new LightButton("Edit Builtins")
                .on("click", () => {
                    this.data.setTo(shortcuts.map(s => Object.assign(s, {is_builtin: false})))
                }))
            .append(new LightButton("Export All")
                .on("click", () => {
                    ExportStringModal.do(JSON.stringify(data.value().map(v => (({is_builtin, ...rest}) => rest)(v.value())), null, 2))
                })
            )
            .append(new LightButton("Export Local")
                .on("click", () => {
                    ExportStringModal.do(JSON.stringify(data.value().filter(s => !s.value().is_builtin).map(v => (({
                                                                                                                       is_builtin,
                                                                                                                       ...rest
                                                                                                                   }) => rest)(v.value())), null, 2))
                })
            )
            .appendTo(this.search_container)

        c("<div style='display: flex'></div>").append(new TextField().css("flex-grow", "1").setPlaceholder("Search Shortcuts...")
            .on("hint", (v) => this.search_term.set(v))
        ).appendTo(this.search_container)

        hbox(
            this.viewport_checkbox = new Checkbox().setValue(false),
            C.span("Only show current viewport")
        )
            .appendTo(this.search_container)

        this.viewport_checkbox.on("changed", () => this.updateVisibleData())

        this.result_container = c().addClass("ctr-shortcut-edit-panel-results").appendTo(this)

        this.visible_data_view.subscribe(results => {
            let existing = this.widgets.map(w => ({keep: false, w: w}))

            this.widgets = results.map(s => {
                let e = existing.find(e => e.w.value == s)

                if (e) {
                    e.keep = true
                    return e.w
                } else {
                    let edit = new ShortcutEdit(s, this.view_layer.getView(s), this.interaction_guard).appendTo(this.result_container)

                    edit.centered.on((v) => this.centered.trigger(v))

                    return edit
                }
            })

            existing.filter(e => !e.keep).forEach(e => e.w.remove())
        }, true)

        this.data.array_changed.on(() => this.updateVisibleData())
    }

    private updateVisibleData() {
        this.visible_data_view.set(this.data.get().filter(s => {
            return s.value().name.includes(this.search_term.value()) && (!this.viewport_checkbox.get() || Rectangle.overlaps(Shortcuts.bounds(s.value()), this.view_layer.getMap().viewport.get()))
        }))
    }
}