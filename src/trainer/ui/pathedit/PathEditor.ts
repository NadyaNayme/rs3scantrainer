import * as leaflet from "leaflet";
import Widget from "lib/ui/Widget";
import {createStepGraphics, PathGraphics} from "../path_graphics";
import TemplateStringEdit from "../widgets/TemplateStringEdit";
import {ScanTrainerCommands} from "trainer/application";
import MapCoordinateEdit from "../widgets/MapCoordinateEdit";
import Properties from "../widgets/Properties";
import LightButton from "../widgets/LightButton";
import Collapsible from "../widgets/modals/Collapsible";
import DirectionSelect from "./DirectionSelect";
import ExportStringModal from "../widgets/modals/ExportStringModal";
import ImportStringModal from "../widgets/modals/ImportStringModal";
import InteractionSelect from "./InteractionSelect";
import {Path} from "lib/runescape/pathing";
import TeleportSelect from "./TeleportSelect";
import {Teleports} from "lib/runescape/teleports";
import {teleport_data} from "data/teleport_data";
import Checkbox from "lib/ui/controls/Checkbox";
import {tilePolygon} from "../polygon_helpers";
import MovementStateView from "./MovementStateView";
import {SmallImageButton} from "../widgets/SmallImageButton";
import {QueryLinks} from "trainer/query_functions";
import {util} from "lib/util/util";
import {TileRectangle} from "lib/runescape/coordinates/TileRectangle";
import movement_state = Path.movement_state;
import issue = Path.issue;
import {Observable, observe} from "lib/properties/Observable";
import Behaviour from "lib/ui/Behaviour";
import {Shortcuts} from "lib/runescape/shortcuts";
import {Rectangle, Vector2} from "lib/math";
import TemplateResolver from "lib/util/TemplateResolver";
import {OpacityGroup} from "lib/gamemap/layers/OpacityLayer";
import {GameMapContextMenuEvent} from "lib/gamemap/MapEvents";
import GameLayer from "lib/gamemap/GameLayer";
import SelectTileInteraction from "lib/gamemap/interaction/SelectTileInteraction";
import {DrawAbilityInteraction} from "./interactions/DrawAbilityInteraction";
import PathEditActionBar from "./PathEditActionBar";
import {InteractionGuard} from "lib/gamemap/interaction/InteractionLayer";
import {GameMapControl} from "lib/gamemap/GameMapControl";
import {ShortcutViewLayer} from "../shortcut_editing/ShortcutView";
import InteractionTopControl from "../map/InteractionTopControl";
import {ObservableArray, observeArray} from "../../../lib/reactive";
import {TileCoordinates} from "../../../lib/runescape/coordinates";
import {C} from "../../../lib/ui/constructors";
import hbox = C.hbox;
import span = C.span;
import spacer = C.spacer;
import sibut = SmallImageButton.sibut;
import * as assert from "assert";
import vbox = C.vbox;

export class IssueWidget extends Widget {
    constructor(issue: issue) {
        super($(`<div class='ctr-step-issue'><div class="ctr-step-issue-icon"></div> ${issue.message}</div>`).attr("level", issue.level.toString()));
    }
}

class StepEditWidget extends Widget {

    constructor(private parent: ControlWidget, public value: PathEditor.OValue) {
        super()

        this.addClass("step-edit-component")

        value.subscribe((v) => {
            // Here???
            v.associated_preview = createStepGraphics(v.raw).addTo(this.parent)
        })

        value.value().augmented.subscribe((v) => {
            this.render(v)
        }, true)
    }

    private render(value: Path.augmented_step) {
        this.empty()

        // Render header
        {
            hbox(
                hbox(
                    span(`T${value.pre_state.tick}`).addClass('nisl-textlink')
                        .addTippy(new MovementStateView(value.pre_state)),
                    c("<span>&nbsp;-&nbsp;</span>"),
                    c("<span class='nisl-textlink'></span>").text(`T${value.post_state.tick}`)
                        .addTippy(new MovementStateView(value.post_state)),
                    c(`<span>: ${Path.title(value.raw)}</span>`)
                ).css("font-weight", "bold"),
                spacer(),
                sibut("assets/nis/arrow_up.png", () => this.parent.editor.value.moveEarlier(value.raw))
                    .tooltip("Move step up").setEnabled(this.parent.editor.value.get().indexOf(value.raw) != 0),
                sibut("assets/nis/arrow_down.png", () => this.parent.editor.value.moveLater(value.raw))
                    .tooltip("Move step down").setEnabled(this.parent.editor.value.get().indexOf(value.raw) != this.parent.editor.value.get().length - 1),
                sibut("assets/icons/delete.png", () => this.value.remove()),
                sibut("assets/icons/fullscreen.png", () =>
                    this.parent.editor.game_layer.getMap().fitBounds(util.convert_bounds(Path.step_bounds(value)), {maxZoom: 4}))
            ).addClass("path-step-edit-widget-control-row").appendTo(this)
        }

        let issues = c().addClass("step-edit-issues").appendTo(this)

        value.issues.forEach((i) => new IssueWidget(i).appendTo(issues))

        let props = new Properties().appendTo(this)

        props.named("Detail",
            new TemplateStringEdit({
                resolver: this.parent.editor.template_resolver,
                generator: () => Path.auto_description(value.raw) // TODO
            })
                .setValue(value.raw.description)
                .on("changed", (v) => this.value.update(o => o.raw.description = v))
        )

        switch (value.raw.type) {
            case "ability":
                /* props.named("From", new MapCoordinateEdit(value.raw.from,
                     () => this.parent.editor.interaction_guard.set(new SelectTileInteraction({
                             preview_render: (tile) => createStepGraphics({
                                 type: "ability",
                                 description: "",
                                 ability: (value.raw as Path.step_ability).ability,
                                 from: tile,
                                 to: (value.raw as Path.step_ability).to,
                             })
                         }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the start of the ${(value.raw as Path.step_ability).ability} by clicking the tile.`))
                             .onStart(() => this.value.value().associated_preview?.setOpacity(0))
                             .onEnd(() => this.value.value().associated_preview?.setOpacity(1))
                     )
                 ))
                     .on("changed", (c) => {
                         this.value.update(v => {
                             assert(v.raw.type == "ability")
                             v.raw.from =
                         })
                         (value.raw as Path.step_ability).from = c
                         this.emit("changed", value.raw)
                     })

                 props.named("To", new MapCoordinateEdit(value.raw.to,
                     () => this.parent.editor.interaction_guard.set(new SelectTileInteraction({
                             preview_render: (tile) => createStepGraphics({
                                 type: "ability",
                                 description: "",
                                 ability: (value.raw as Path.step_ability).ability,
                                 from: (value.raw as Path.step_ability).from,
                                 to: tile,
                             })
                         }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the target of the ${(value.raw as Path.step_ability).ability} by clicking the tile.`))
                             .onStart(() => this._preview.setOpacity(0))
                             .onEnd(() => this._preview.setOpacity(1))
                     ))
                     .on("changed", (c) => {
                         (value.raw as Path.step_ability).to = c
                         this.emit("changed", value.raw)
                     }))

                 */

                props.row(new LightButton("Redraw")
                    .on("click", () => {

                        assert(value.raw.type == "ability")

                        // FIXME
                        new DrawAbilityInteraction(value.raw.ability, false, {
                            done_handler: (new_s) => {
                                Object.assign(value.raw, new_s)
                                this.emit("changed", value.raw)
                            }
                        })
                            .onStart(() => this.value.value().associated_preview?.setOpacity(0))
                            .onEnd(() => this.value.value().associated_preview?.setOpacity(1))


                        /*
                        .setStartPosition(s.from)
                        .tapEvents((e) => {
                            e
                                .on("done", (new_s) => {
                                    Object.assign(s, new_s)
                                    this.updatePreview()
                                    this.emit("changed", value.raw)
                                })
                                .on("cancelled", () => {
                                    this._preview.addTo(this.parent._preview_layer)
                                })
                        }).activate()*/
                    })
                )

                break;
            /* // TODO: Reenable
            case "redclick":

                props.named("Where", new MapCoordinateEdit(value.raw.where,
                    () => this.parent.editor.interaction_guard.set(new SelectTileInteraction({
                            preview_render: (tile) => createStepGraphics({
                                type: "redclick",
                                description: "",
                                where: tile,
                                how: (value.raw as Path.step_redclick).how,
                            })
                        }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the location of the redclick by clicking the tile.`))
                            .onStart(() => this._preview.setOpacity(0))
                            .onEnd(() => this._preview.setOpacity(1))
                    ))
                    .on("changed", (c) => {
                        (value.raw as (Path.step_powerburst | Path.step_redclick)).where = c
                        this.emit("changed", value.raw)
                    }))

                props.named("Action", new InteractionSelect()
                    .setValue(value.raw.how)
                    .on("selection_changed", v => {
                        (value.raw as Path.step_interact).how = v
                        this.emit("changed", value.raw)
                    })
                )
                break
            case "powerburst":

                props.named("Where", new MapCoordinateEdit(value.raw.where,
                    () => this.parent.editor.interaction_guard.set(new SelectTileInteraction({
                            preview_render: (tile) => createStepGraphics({
                                type: "powerburst",
                                description: "",
                                where: tile,
                            })
                        }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the location of the redclick by clicking the tile.`))
                            .onStart(() => this._preview.setOpacity(0))
                            .onEnd(() => this._preview.setOpacity(1))
                    ))
                    .on("changed", (c) => {
                        (value.raw as (Path.step_powerburst | Path.step_redclick)).where = c
                        this.emit("changed", value.raw)
                    }))

                break

            case "run":
                props.row(new LightButton("Repath")
                    .on("click", () => {
                        let s = value.raw as Path.step_run

                        if (this._preview) this._preview.remove()

                        new DrawRunInteraction(this.parent.editor.game_layer.getMap().getActiveLayer())
                            .setStartPosition(s.waypoints[0])
                            .tapEvents((e) => {
                                e
                                    .on("done", (new_s) => {
                                        Object.assign(s, new_s)
                                        this.updatePreview()
                                        this.emit("changed", value.raw)
                                    })
                                    .on("cancelled", () => {
                                        this._preview.addTo(this.parent._preview_layer)
                                    })
                            }).activate()
                    })
                )
                break
            case "interaction":

                props.named("Ticks", c("<input type='number' class='nisinput' min='0'>")
                    .tapRaw((c) => c.val((value.raw as Path.step_interact).ticks).on("change", () => {
                        (value.raw as Path.step_interact).ticks = Number(c.val())
                        this.emit("changed", value.raw)
                    }))
                )

                props.named("Starts", new MapCoordinateEdit(value.raw.starts,
                    () => this.parent.editor.interaction_guard.set(new SelectTileInteraction({
                        preview_render: (tile) => ShortcutViewLayer.render_transport_arrow(tile, (value.raw as Path.step_interact).ends_up)
                    }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText("Select the start of the transport by clicking a tile.")))
                ))
                    .on("changed", (c) => {
                        (value.raw as Path.step_interact).starts = c
                        this.emit("changed", value.raw)
                    })

                props.named("Click", new MapCoordinateEdit(value.raw.where,
                    () => this.parent.editor.interaction_guard.set(new SelectTileInteraction()
                        .attachTopControl(new InteractionTopControl().setName("Selecting tile").setText("Select where the shortcut is clicked by clicking a tile.")))
                ))
                    .on("changed", (c) => {
                        (value.raw as Path.step_interact).where = c
                        this.emit("changed", value.raw)
                    })

                props.named("Ends up", new MapCoordinateEdit(value.raw.ends_up,
                    () => this.parent.editor.interaction_guard.set(new SelectTileInteraction({
                        preview_render: (tile) => ShortcutViewLayer.render_transport_arrow((value.raw as Path.step_interact).starts, tile)
                    }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText("Select the target of the transport by clicking a tile.")))
                ))
                    .on("changed", (c) => {
                        (value.raw as Path.step_interact).ends_up = c
                        this.emit("changed", value.raw)
                    })

                props.named("Facing", new DirectionSelect()
                    .setValue(value.raw.forced_direction)
                    .on("selection_changed", v => {
                        (value.raw as Path.step_interact).forced_direction = v
                        this.emit("changed", value.raw)
                    })
                )

                props.named("Action", new InteractionSelect()
                    .setValue(value.raw.how)
                    .on("selection_changed", v => {
                        (value.raw as Path.step_interact).how = v
                        this.emit("changed", value.raw)
                    })
                )

                break
            case "orientation":
                props.named("Facing", new DirectionSelect()
                    .setValue(value.raw.direction)
                    .on("selection_changed", v => {
                        (value.raw as Path.step_orientation).direction = v
                        this.emit("changed", value.raw)
                    })
                )

                break

            */
            case "teleport":
                let current = Teleports.find(teleport_data.getAllFlattened(), value.raw.id)

                props.named("Teleport", new TeleportSelect().setValue(current)
                    .on("selection_changed", tele =>
                        this.value.update((v) => {
                            assert(v.raw.type == "teleport")
                            v.raw.id = tele.id
                        })
                    ))

                /* // Reenable
                props.named("Override?", new Checkbox()
                    .setValue(value.raw.spot_override != null)
                    .on("changed", v => {

                        if (v) (value.raw as Path.step_teleport).spot_override = {x: 0, y: 0, level: 0}
                        else (value.raw as Path.step_teleport).spot_override = undefined

                        this.emit("changed", value.raw)
                    })
                )

                if (value.raw.spot_override) {
                    props.named("Coordinates", new MapCoordinateEdit(value.raw.spot_override,
                            () => this.parent.editor.interaction_guard.set(new SelectTileInteraction({
                                // preview_render: (tile) => {}
                            }).attachTopControl(new InteractionTopControl().setName("Selecting tile").setText("Select the overriden target of the teleport by clicking a tile.")))
                        )
                            .on("changed", (c) => {
                                (value.raw as Path.step_teleport).spot_override = c
                                this.emit("changed", value.raw)
                            })
                    )
                }

                 */

                break
        }

        // TODO: Fix scroll events passing through
        // TODO: Add analytics
        // TODO: Action select
    }
}

class ControlWidget extends GameMapControl {
    steps_container: Widget
    step_widgets: StepEditWidget[] = []

    issue_container: Widget

    constructor(public editor: PathEditor,
                private data: Observable<{ path: Path.augmented, steps: PathEditor.OValue[] }>
    ) {
        super({
            position: "left-top",
            type: "floating"
        })

        this.content.addClass("path-edit-control")

        this.steps_container = vbox().appendTo(this.content).css2({
            "max-height": "400px",
            "overflow-y": "auto",
        })

        /* // TODO: Recover this functionality elsewhere
        {
            let controls_collapsible = new Collapsible("Controls").appendTo(this.content)
            let props = new Properties().appendTo(controls_collapsible.content_container)

            this.issue_container = c()

            props.row(this.issue_container)

            let control_container = c("<div class='ctr-button-container'></div>")

            props.row(control_container)

            new LightButton("Commit").on("click", () => {
                this.editor.current_options.commit_handler(this.editor.value.get())
            }).setEnabled(!!this.editor.current_options.commit_handler).appendTo(control_container)

            /*new LightButton("Save & Close").on("click", () => {
                this.emit("saved", this.value)
                this.emit("closed", null)
            }).setEnabled(this.options.save_enabled).appendTo(control_container)

            new LightButton("Discard").on("click", () => {
                this.editor.current_options?.discard_handler()
                this.editor.reset()
            }).appendTo(control_container)

            /*new LightButton("Show JSON")
                .on("click", () => {
                    ExportStringModal.do(JSON.stringify(this.value, null, 2))
                })
                .appendTo(control_container)


            new LightButton("Export")
                .on("click", () => ExportStringModal.do(Path.export_path(this.editor.value.get())))
                .appendTo(control_container)
            new LightButton("Import")
                .on("click", async () => {
                    this.editor.value.setAsync(ImportStringModal.do((s) => Path.import_path(s)))
                })
                .appendTo(control_container)

            new LightButton("Share")
                .on("click", () => {
                    ExportStringModal.do(QueryLinks.link(ScanTrainerCommands.load_path, {
                        steps: this.editor.value.get(),
                        start_state: this.editor.current_options.start_state,
                        target: this.editor.current_options.target,
                    }), "Use this link to directly link to this path.")
                })
                .appendTo(control_container)
        }*/

        data.subscribe(({path, steps}) => this.render(path, steps))


        //this.content.container.on("click", (e) => e.stopPropagation())
        //this.content.addClass("nis-map-control") // TODO? Need this?
    }

    private render(augmented: Path.augmented, steps: PathEditor.OValue[]) {
        /*{
            this.issue_container.empty()

            for (let issue of augmented.issues) {
                new IssueWidget(issue).appendTo(this.issue_container)
            }
        }*/

        let existing: { widget: StepEditWidget, keep: boolean }[] = this.step_widgets.map(w => ({widget: w, keep: false}))

        // Render edit widgets for indiviual steps
        this.step_widgets = steps.map(step => {
            let e = existing.find(e => e.widget.value == step)

            if (e) {
                e.keep = true
                return e.widget
            } else {
                return new StepEditWidget(this, step)
            }
        })

        existing.forEach(e => { if (e.keep) e.widget.detach() })

        this.steps_container.empty().append(...this.step_widgets)

        if (steps.length == 0) {
            c("<div style='text-align: center'></div>").appendTo(this.steps_container)
                .append(c("<span>No steps yet.</span>"))
                .append(c("<span class='nisl-textlink'>&nbsp;Hover to show state.</span>")
                    .addTippy(new MovementStateView(augmented.pre_state)))
        }

        return this
    }
}

class PathEditorGameLayer extends GameLayer {
    constructor(private editor: PathEditor) {
        super();

        new ShortcutViewLayer(observeArray(editor.data.shortcuts)).addTo(this)
    }

    eventContextMenu(event: GameMapContextMenuEvent) {
        event.onPost(() => {
            if (this.editor.isActive()) {

                // TODO: Run here/Redclick

                {
                    this.getMap().getTeleportLayer().teleports
                        .filter(t => Vector2.max_axis(Vector2.sub(t.spot, event.coordinates)) < 2)
                        .forEach(t => {
                            event.add({
                                type: "basic",
                                text: `Teleport: ${t.hover}`,
                                handler: () => {
                                    this.editor.value.add({
                                        raw: Path.auto_describe({
                                            type: "teleport",
                                            description: "",
                                            id: t.id,
                                        })
                                    })
                                }
                            })
                        })
                }

                this.editor.data.shortcuts
                    .filter(s => Rectangle.contains(Shortcuts.bounds(s), event.coordinates))
                    .map(Shortcuts.normalize)
                    .forEach(s => {
                        s.actions.forEach(a => {
                            this.editor.value.augmented.get().post_state.position.tile

                            let start = this.editor.value.augmented.get().post_state.position.tile
                                ? TileRectangle.clampInto(this.editor.value.augmented.get().post_state.position.tile, a.interactive_area)
                                : TileRectangle.center(a.interactive_area)

                            let ends: TileCoordinates

                            switch (a.movement.type) {
                                case "fixed":
                                    ends = a.movement.target
                                    break;
                                case "offset":
                                    ends = TileCoordinates.move(start, a.movement.offset)
                                    ends.level += a.movement.offset.level

                                    break;
                            }

                            event.add({
                                type: "basic",
                                text: a.name,
                                handler: () => {
                                    this.editor.value.addBack({
                                        type: "interaction",
                                        description: a.name,
                                        ticks: a.time,
                                        starts: start,
                                        where: TileRectangle.center(s.clickable_area, false),
                                        ends_up: ends,
                                        forced_direction: null, // TODO:
                                        how: a.cursor
                                    })
                                }
                            })
                        })
                    })
            }
        })
    }
}

/*
class PathBuilder extends Observable<Path.raw> {
    public augmented_async: Observable<Promise<Path.augmented>> = observe(null)
    public augmented: Observable<Path.augmented> = observe(null)
    public post_state: Observable<Path.movement_state>

    private start_state: movement_state = null
    private target: TileRectangle = null

    constructor() {
        super([]);

        this.subscribe(v => this.augmented_async.set(Path.augment(v, this.start_state, this.target)))
        this.post_state = this.augmented.map(p => p?.post_state)
        this.augmented_async.subscribe(v => this.augmented.setAsync(v))
    }

    setMeta(start_state: movement_state, target: TileRectangle) {
        this.start_state = start_state
        this.target = target

        this.augmented.setAsync(Path.augment(this.get(), this.start_state, this.target))
    }

    addBack(step: Path.step): this {
        this.update(p => p.push(step))

        return this
    }

    remove(step: Path.step): this {
        this.update(p => {
            p.splice(p.indexOf(step), 1)
        })

        return this
    }

    moveEarlier(step: Path.step): this {
        let index = this.get().indexOf(step)
        let to_index = Math.max(0, index - 1)

        if (index != to_index) {
            this.update(p => {
                p.splice(to_index, 0, p.splice(index, 1)[0])
            })
        }

        return this
    }

    moveLater(step: Path.step): this {
        let index = this.get().indexOf(step)
        let to_index = Math.min(this.get().length - 1, index + 1)

        if (index != to_index) {
            this.update(p => {
                p.splice(to_index, 0, p.splice(index, 1)[0])
            })
        }

        return this
    }
}
*/


export class PathBuilder extends ObservableArray<PathEditor.Value> {
    override add(v: PathEditor.Value): ObservableArray.ObservableArrayValue<PathEditor.Value> {
        if (!v.augmented) v.augmented = observe(null)

        return super.add(v);
    }

    override setTo(data: PathEditor.Value[]): this {
        data.forEach(v => {
            if (!v.augmented) v.augmented = observe(null)
        })

        return super.setTo(data)
    }
}


export class PathEditor extends Behaviour {
    private control: ControlWidget = null
    private handler_layer: PathEditorGameLayer = null

    action_bar: PathEditActionBar

    interaction_guard: InteractionGuard

    value: PathEditor.Data
    augmented_value: Observable<{ path: Path.augmented, steps: PathEditor.OValue[] }>

    constructor(public game_layer: GameLayer,
                public template_resolver: TemplateResolver,
                public data: {
                    shortcuts: Shortcuts.shortcut[],
                    teleports: Teleports.flat_teleport[]
                },
                private options: PathEditor.options_t
    ) {
        super()

        this.value = new PathBuilder()
        this.augmented_value = observe({path: null, steps: []})

        this.value.array_changed.on(async (v) => {
            let aug = await Path.augment(v.data.map(s => s.value().raw), this.options.start_state, this.options.target)

            for (let i = 0; i < aug.steps.length; i++) {
                v.data[i].value().augmented?.set(aug.steps[i])
            }

            this.augmented_value.set({path: aug, steps: v.data})
        })

        this.value.element_added.on(e => this.updatePreview(e))
        this.value.element_removed.on(e => e.value().associated_preview?.remove())
        this.value.element_changed.on(e => this.updatePreview(e))

        this.augmented_value.subscribe(({path}) => {
            if (this.action_bar) this.action_bar.state.set(path.post_state)
        })

        // Set up handler layer, but don't add it anywhere yet.
        this.handler_layer = new PathEditorGameLayer(this)
        this.control = new ControlWidget(this, this.augmented_value).addTo(this.handler_layer)
        this.action_bar = new PathEditActionBar(this, this.interaction_guard).addTo(this.handler_layer)
        this.interaction_guard = new InteractionGuard().setDefaultLayer(this.handler_layer)
        
        this.value.setTo(options.initial.map(s => ({raw: s})))
    }

    private updatePreview(o: PathEditor.OValue) {
        let value = o.value()

        if (value.associated_preview) {
            value.associated_preview.remove()
            value.associated_preview = null
        }

        value.associated_preview = createStepGraphics(value.raw).addTo(this.handler_layer)
    }

    protected begin() {
        this.handler_layer.addTo(this.game_layer)
        //TODO//this.game_layer.getMap().fitBounds(util.convert_bounds(Path.path_bounds(await this.value.augmented_async.get())).pad(0.1), {maxZoom: 4})
    }

    protected end() {
        this.handler_layer.remove()
    }
}

export namespace PathEditor {

    export type Value = { raw: Path.step, associated_preview?: OpacityGroup, augmented?: Observable<Path.augmented_step> }
    export type OValue = ObservableArray.ObservableArrayValue<Value>
    export type Data = PathBuilder

    export type options_t = {
        initial: Path.raw,
        commit_handler?: (p: Path.raw) => any,
        discard_handler?: () => any,
        target?: TileRectangle,
        start_state?: movement_state
    }
}