import {Sliders} from "./ui/neosolving/puzzles/Sliders";
import {Application} from "./application";
import * as lodash from "lodash";
import SliderState = Sliders.SliderState;

export class CrowdSourcing {
  constructor(private parent: Application, private server_url: string) {

  }

  private endpoint(endpoint: string): string {
    return `${this.server_url}/api/crowdsourcing/${endpoint}`
  }

  pushSlider(slider: SliderState): void {
    if (this.parent.settings.settings.crowdsourcing.slider_states) {
      console.log(`Adding ${slider} to crowdsourcing`)

      fetch(this.endpoint("initial_slider_state"), {
        method: "POST",
        body: JSON.stringify(slider),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
      });
    }
  }
}

export namespace CrowdSourcing {
  export type Settings = {
    slider_states: boolean
  }

  export namespace Settings {
    export const DEFAULT: Settings = {
      slider_states: true
    }

    export function normalize(settings: Settings): Settings {
      if (!settings) return lodash.cloneDeep(DEFAULT)

      if (![true, false].includes(settings.slider_states)) settings.slider_states = DEFAULT.slider_states

      return settings
    }
  }
}