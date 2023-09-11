import {MapCoordinate, MapRectangle} from "../coordinates";
import {indirected, method_base, resolved} from "../methods";
import {area_pulse, Pulse} from "./scans";
import {Modal} from "../../ui/widgets/modal";
import {ScanStep} from "../clues";
import {util} from "../../util/util";
import {Path} from "../pathing";
import * as lodash from "lodash";
import {TextRendering} from "../../ui/TextRendering";
import {Rectangle, Vector2} from "../../util/math";

export namespace ScanTree {

    import movement_state = Path.movement_state;

    export function dig_area(spot: MapCoordinate): MapRectangle {
        return {
            topleft: {x: spot.x - 1, y: spot.y + 1},
            botright: {x: spot.x + 1, y: spot.y - 1},
            level: spot.level
        }
    }

    import shorten_integer_list = util.shorten_integer_list;
    import render_digspot = TextRendering.render_digspot;

    // There is world in which this type isn't needed and scan trees are just a tree of paths.
    // There are some drawbacks in this idea, so for now it stays how it is.
    //  - pro: Would make sections that are like "check the remaining spots" simpler
    //  - pro: Cleaner implementation as a whole
    //  - con: People are used to the format
    //  - con: Would maybe exclude the ability to mark area with leeway
    //  - con: Having dedicated areas incentivizes to make keep the tree simple instead of having a million decision points
    //  - con: How would that work with non-deterministic paths/teleports?

    export type ScanRegion = {
        id: number,
        name: string
        area: MapRectangle
    }

    export type tree = method_base & {
        type: "scantree",
        spot_ordering: MapCoordinate[],
        assumes_meerkats: boolean,
        areas: ScanRegion[],
        root: decision_tree
    }

    export type resolved_scan_tree = tree & resolved<ScanStep>
    export type indirect_scan_tree = tree & indirected

    /**
     * @deprecated mark as deprecated to flag accidental use of draft type
     */
    type DRAFT_new_decision_tree = {
        area?: ScanRegion,
        path: Path.step[]
        children: {
            key: {
                pulse: Pulse,
                spot?: MapCoordinate
            },
            value: decision_tree
        }[]
    }

    /**
     * TODO: Plan: How to potentially transition to the above draft while always having a better state than before
     *  1. (Done) Make scan spots be identified by id
     *  2. (Done) Allow scan spots to be anonymous (empty name)
     *  3. Outsource spot children into leaf nodes, make path be an immediate member
     *  4. Allow nodes to not have a scan spot at all
     */

    type PulseInformation = Pulse & ({
        pulse: 3
        spot?: MapCoordinate
    } | { pulse: 1 | 2 })

    namespace PulseInformation {
        export function equals(a: PulseInformation, b: PulseInformation): boolean {
            return Pulse.equals(a, b) && (a.pulse == 3) && (b.pulse == 3) && MapCoordinate.eq2(a?.spot, b.spot)
        }
    }

    export type decision_tree = {
        path: Path.raw
        scan_spot_id: number | null,
        directions: string,
        children: {
            key: PulseInformation,
            value: decision_tree
        }[]
    }

    export type augmented_decision_tree = {
        raw: decision_tree,
        raw_root: tree,
        root: augmented_decision_tree,
        parent: {
            key: PulseInformation
            node: augmented_decision_tree,
        },
        //is_leaf?: boolean,
        region?: ScanRegion,
        //leaf_spot?: MapCoordinate,
        path: Path.raw,
        depth: number,
        remaining_candidates: MapCoordinate[],
        decisions: ScanInformation[],
        children: {
            key: Pulse,
            value: augmented_decision_tree
        }[]
    }

    export function traverse(tree: decision_tree, f: (_: decision_tree) => void): void {
        if (tree) f(tree)

        tree.children.forEach(c => traverse(c.value, f))
    }

    export namespace augmented_decision_tree {
        export function traverse(node: augmented_decision_tree, f: (_: augmented_decision_tree) => void) {
            f(node)

            node.children.forEach(c => traverse(c.value, f))
        }

        export function traverse_parents(node: augmented_decision_tree, f: (_: augmented_decision_tree) => void): void {
            if (node.parent == null) return

            f(node.parent.node)
            traverse_parents(node.parent.node, f)
        }
    }

    export function init_leaf(): decision_tree {
        return {
            scan_spot_id: null,
            children: [],
            directions: "Missing directions",
            path: {
                steps: []
            },
        }
    }

    function get_target_region(tree: ScanTree.tree, node: ScanTree.decision_tree): ScanRegion {
        if (node.scan_spot_id == null) return null

        return ScanTree.getRegionById(tree, node.scan_spot_id)
    }

    export async function prune_clean_and_propagate(tree: ScanTree.resolved_scan_tree): Promise<ScanTree.tree> {
        async function helper(node: decision_tree, candidates: MapCoordinate[], pre_state: Path.movement_state): Promise<void> {
            node.path.start_state = lodash.cloneDeep(pre_state)

            let augmented_path = await Path.augment(node.path)
            let region = get_target_region(tree, node)

            let area = region?.area ||
                MapRectangle.fromTile(augmented_path.post_state?.position?.tile)

            if (!region) node.scan_spot_id = null

            // Update children to remove all dead branches and add missing branches
            let pruned_children: {
                child: {
                    key: PulseInformation,
                    value: decision_tree
                },
                candidates: MapCoordinate[]
            }[] = (!area) ? []
                : spot_narrowing(candidates, area, assumedRange(tree))
                    .filter(n => n.narrowed_candidates.length > 0)
                    .map(({pulse, narrowed_candidates}) => {
                        return {
                            child: node.children.find(c => PulseInformation.equals(pulse, c.key)) || {
                                key: pulse,
                                value: init_leaf()
                            },
                            candidates: narrowed_candidates
                        }
                    })

            // When there is only one child, the current position produces no information at all
            // So there is no point in adding children, which is why they are removed by this statement
            if (pruned_children.length == 1) pruned_children = []

            node.children = pruned_children.map(c => c.child)

            pruned_children.forEach(({child, candidates}) => {
                // Propagate state recursively
                let cloned_state = augmented_path.post_state
                cloned_state.tick += 1 // Assume 1 tick reaction time between steps. Approximation, but may help to make timings and cooldowns more realistic

                helper(child.value, candidates, cloned_state)
            })
        }

        if (!tree.root) tree.root = init_leaf()

        await helper(tree.root, tree.clue.solution.candidates, Path.movement_state.start())

        return tree
    }

    export function assumedRange(tree: resolved_scan_tree): number {
        let r = tree.clue.range
        if (tree.assumes_meerkats) r += 5;
        return r
    }

    export function spotNumber(self: ScanTree.tree, spot: MapCoordinate): number {
        return self.spot_ordering.findIndex((s) => Vector2.eq(s, spot)) + 1
    }

    export async function augment(tree: resolved_scan_tree): Promise<augmented_decision_tree> {
        async function helper(
            node: decision_tree,
            parent: { node: augmented_decision_tree, key: PulseInformation },
            depth: number,
            remaining_candidates: MapCoordinate[],
            decisions: ScanInformation[],
        ): Promise<augmented_decision_tree> {

            let t: augmented_decision_tree = {
                //directions: null,
                raw_root: tree,
                root: null,
                parent: parent,
                region: null,
                path: null,
                raw: node,
                depth: depth,
                remaining_candidates: remaining_candidates,
                decisions: decisions,
                children: []
            }

            t.root = parent == null ? t : parent.node.root

            // For triples with more than one candidate, inherit the parent's spot, TODO: Is this sensible?
            if (parent && parent.kind.pulse == 3 && remaining_candidates.length > 1) t.region = parent.node.region

            if (node.scan_spot_id != null) {
                t.region = tree.areas.find((a) => a.id == node.scan_spot_id)

                let path = node.paths.find((p) => p.spot == null)

                if (path) {
                    t.path = path.path
                    t.directions = path.directions
                }

                let narrowing = spot_narrowing(remaining_candidates, t.region, assumedRange(tree))

                // The node is not a leaf node, handle all relevant children
                for (let child of node.children) {
                    t.children.push({
                        key: child.key,
                        value: await helper(
                            child ? child.value : null,
                            {node: t, kind: child.key},
                            depth + 1,
                            narrowing.find(n => Pulse.equals(n.pulse, child.key)).narrowed_candidates,
                            decisions.concat([{
                                area: t.region,
                                ping: child.key
                            }])
                        )
                    })
                }
            } else {
                if (remaining_candidates.length > 1) {
                    t.children = []

                    remaining_candidates.forEach((c) => {

                        let p = node.paths.find((p) => MapCoordinate.eq2(p.spot, c))

                        t.children.push({
                            key: null,
                            value: {
                                children: [],
                                root: t.root,
                                decisions: t.decisions,
                                depth: t.depth + 1,
                                directions: p.directions,
                                is_leaf: true,
                                leaf_spot: c,
                                parent: {key: null, node: t},
                                path: p.path,
                                raw: null,
                                remaining_candidates: [c],
                                raw_root: t.raw_root,
                            }
                        })
                    })

                } else {
                    t.is_leaf = true
                    t.leaf_spot = remaining_candidates[0]

                    const path = node.paths.find(p => MapCoordinate.eq2(p.spot, t.leaf_spot))

                    t.path = path.path
                    t.directions = path.directions
                }
            }

            return t
        }

        await prune_clean_and_propagate(tree)

        return helper(tree.root, null, 0, tree.clue.solution.candidates, []);
    }

    export function getRegionById(tree: ScanTree.tree, id: number): ScanRegion {
        return tree.areas.find(a => a.id == id)
    }

    export function createNewSpot(tree: ScanTree.tree, area: MapRectangle): ScanRegion {
        for (let i: number = 0; i < 1000; i++) {
            if (!tree.areas.some(a => a.id == i)) {
                let a = {
                    id: i,
                    name: "New",
                    area: area
                }

                tree.areas.push(a)

                return a
            }
        }
    }

    export class ScanExplanationModal extends Modal {
        protected hidden() {
            ($("#pingexplanationvideo").get(0) as HTMLVideoElement).pause();
        }
    }

    export type ScanInformation = PulseInformation & {
        area: MapRectangle
    }

    export namespace ScanInformation {
        export function toString(decision: ScanInformation) {
            return "TODO" // TODO:
            //return `${decision.area.name}${Pulse.meta(decision.ping).shorted}`
        }
    }

    export function spot_narrowing(candidates: MapCoordinate[], area: MapRectangle, range: number): {
        pulse: PulseInformation,
        narrowed_candidates: MapCoordinate[]
    }[] {
        return Pulse.all.flatMap((p) => {
            let remaining = narrow_down(candidates, {area: area, pulse: p.pulse, different_level: p.different_level}, range)

            if (p.pulse == 3) {
                return remaining.map(r => {
                    return {
                        pulse: p,
                        narrowed_candidates: [r]
                    }
                })
            } else {
                return [{
                    pulse: p,
                    narrowed_candidates: remaining
                }]
            }
        })
    }

    export function narrow_down(candidates: MapCoordinate[], information: ScanInformation, range: number): MapCoordinate[] {
        return candidates.filter((s) => area_pulse(s, information.area, range).some((p2) => Pulse.equals(information, p2)))
    }

    export function template_resolvers(node: ScanTree.augmented_decision_tree, spot?: MapCoordinate): Record<string, (args: string[]) => string> {
        return {
            "target": () => {
                if (node.is_leaf) {
                    return render_digspot(spotNumber(node.raw_root, node.leaf_spot))
                } else if (spot) {
                    return render_digspot(spotNumber(node.raw_root, spot))
                } else if (node.region) {
                    return `{{scanarea ${node.region.name}}}`
                } else {
                    return "{ERROR: No target}"
                }
            },
            "candidates":
                () => {
                    return util.natural_join(
                        shorten_integer_list((spot ? [spot] : node.remaining_candidates)
                                .map(c => spotNumber(node.raw_root, c)),
                            render_digspot
                        ))
                }
        }
    }
}