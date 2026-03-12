const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

const LitElement = customElements.get("hui-masonry-view")
  ? Object.getPrototypeOf(customElements.get("hui-masonry-view"))
  : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const editorTranslations = {
  "fr": {
    "entity": "Entité",
    "name": "Nom",
    "detail": "Détail",
    "general": "Général",
    "currentWeather": "Météo actuelle",
    "showName": "Ville",
    "showTemperature": "Température",
    "details": "Détails",
    "alerts": "Alertes",
    "oneHourRain": "Pluie dans l'heure",
    "animatedIcons": "Icônes animées",
    "showSun": "Lever/Coucher du soleil",
    "windGustZeroDash": "Rafales : - si 0 km/h",
    "tapAction": "Action au clic",
    "holdAction": "Action au clic long",
    "doubleTapAction": "Action au double clic",
    "hourlyForecast": "Prévisions par heure",
    "numberOfHours": "Nombre d'heures",
    "wind": "Vent",
    "windGusts": "Rafales",
    "precipitation": "Précipitations",
    "humidity": "Humidité",
    "windArrow": "Girouette",
    "dailyForecast": "Prévisions par jour",
    "numberOfDays": "Nombre de jours",
    "rainRisk": "Risque de pluie",
    "uv": "UV",
    "cloudCover": "Couverture nuageuse",
    "freezeRisk": "Risque de gel",
    "snowRisk": "Risque de neige",
    "weatherAlert": "Vigilance Météo",
    "iconsDir": "Répertoire des icones",
    "iconsDirPath": "Chemin",
  },
  "en": {
    "entity": "Entity",
    "name": "Name",
    "detail": "Detail",
    "general": "General",
    "currentWeather": "Current weather",
    "showName": "City",
    "showTemperature": "Temperature",
    "details": "Details",
    "alerts": "Alerts",
    "oneHourRain": "Rain in the hour",
    "animatedIcons": "Animated icons",
    "showSun": "Sunrise/Sunset",
    "windGustZeroDash": "Gusts: show - if 0",
    "tapAction": "Tap action",
    "holdAction": "Hold action",
    "doubleTapAction": "Double tap action",
    "hourlyForecast": "Hourly forecast",
    "numberOfHours": "Number of hours",
    "wind": "Wind",
    "windGusts": "Wind gusts",
    "precipitation": "Precipitation",
    "humidity": "Humidity",
    "windArrow": "Wind direction",
    "dailyForecast": "Daily forecast",
    "numberOfDays": "Number of days",
    "rainRisk": "Rain probability",
    "uv": "UV",
    "cloudCover": "Cloud cover",
    "freezeRisk": "Freeze risk",
    "snowRisk": "Snow risk",
    "weatherAlert": "Weather alert",
    "iconsDir": "Icons directory",
    "iconsDirPath": "Path",
  },
};

const DefaultSensors = new Map([
  ["detailEntity", "_rain_chance"],
  ["cloudCoverEntity", "_cloud_cover"],
  ["rainChanceEntity", "_rain_chance"],
  ["freezeChanceEntity", "_freeze_chance"],
  ["snowChanceEntity", "_snow_chance"],
  ["uvEntity", "_uv"],
  ["rainForecastEntity", "_next_rain"],
]);

export class MeteofranceWeatherCardEditor extends LitElement {
  setConfig(config) {
    this._config = { ...config };

    if (Object.keys(config).length === 2 && config.entity !== undefined) {
      this._weatherEntityChanged(config.entity.split(".")[1]);
      fireEvent(this, "config-changed", { config: this._config });
    }
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  get _entity() { return this._config.entity || ""; }
  get _name() { return this._config.name || ""; }
  get _icons() { return this._config.icons || ""; }
  get _current() { return this._config.current !== false; }
  get _details() { return this._config.details !== false; }
  get _daily_forecast() { return this._config.daily_forecast !== false; }
  get _number_of_daily_forecasts() { return this._config.number_of_daily_forecasts || 5; }
  get _hourly_forecast() { return this._config.hourly_forecast !== false; }
  get _number_of_hourly_forecasts() { return this._config.number_of_hourly_forecasts || 5; }
  get _hourly_wind() { return this._config.hourly_wind !== false; }
  get _hourly_wind_gust() { return this._config.hourly_wind_gust !== false; }
  get _hourly_precipitation() { return this._config.hourly_precipitation !== false; }
  get _hourly_humidity() { return this._config.hourly_humidity !== false; }
  get _hourly_wind_icons() { return this._config.hourly_wind_icons !== false; }
  get _daily_wind() { return this._config.daily_wind !== false; }
  get _daily_wind_gust() { return this._config.daily_wind_gust !== false; }
  get _daily_precipitation() { return this._config.daily_precipitation !== false; }
  get _daily_humidity() { return this._config.daily_humidity !== false; }
  get _one_hour_forecast() { return this._config.one_hour_forecast !== false; }
  get _alert_forecast() { return this._config.alert_forecast !== false; }
  get _animated_icons() { return this._config.animated_icons !== false; }
  get _show_sun() { return this._config.show_sun !== false; }
  get _show_name() { return this._config.show_name !== false; }
  get _show_temperature() { return this._config.show_temperature !== false; }
  get _wind_gust_zero_dash() { return this._config.wind_gust_zero_dash !== false; }
  get _tap_action() { return this._config.tap_action || {}; }
  get _hold_action() { return this._config.hold_action || {}; }
  get _double_tap_action() { return this._config.double_tap_action || {}; }
  get _alertEntity() { return this._config.alertEntity || ""; }
  get _cloudCoverEntity() { return this._config.cloudCoverEntity || ""; }
  get _freezeChanceEntity() { return this._config.freezeChanceEntity || ""; }
  get _rainChanceEntity() { return this._config.rainChanceEntity || ""; }
  get _rainForecastEntity() { return this._config.rainForecastEntity || ""; }
  get _snowChanceEntity() { return this._config.snowChanceEntity || ""; }
  get _uvEntity() { return this._config.uvEntity || ""; }
  get _detailEntity() { return this._config.detailEntity || ""; }

  getTranslations() {
    const lang = (this.hass.selectedLanguage || this.hass.language || "fr").split("-")[0];
    return editorTranslations[lang] || editorTranslations["fr"];
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const t = this.getTranslations();

    return html`
      <div class="card-config">
        <div>
          ${this.renderWeatherPicker(t.entity, this._entity, "entity")}
          ${this.renderTextField(t.name, this._name, "name")}
          ${this.renderSensorPicker(t.detail, this._detailEntity, "detailEntity")}
          
          ${this.renderSectionHeader(t.currentWeather, this._current, "current")}
          ${this._current ? html`
            <ul class="switches">
              ${this.renderSwitchOption(t.showName, this._show_name, "show_name")}
              ${this.renderSwitchOption(t.showTemperature, this._show_temperature, "show_temperature")}
              ${this.renderSwitchOption(t.details, this._details, "details")}
              ${this.renderSwitchOption(t.alerts, this._alert_forecast, "alert_forecast")}
              ${this.renderSwitchOption(t.oneHourRain, this._one_hour_forecast, "one_hour_forecast")}
              ${this.renderSwitchOption(t.animatedIcons, this._animated_icons, "animated_icons")}
              ${this.renderSwitchOption(t.showSun, this._show_sun, "show_sun")}
              ${this.renderSwitchOption(t.windGustZeroDash, this._wind_gust_zero_dash, "wind_gust_zero_dash")}
            </ul>
          ` : ""}

          ${this.renderSectionHeader(t.hourlyForecast, this._hourly_forecast, "hourly_forecast")}
          ${this._hourly_forecast ? html`
            ${this.renderNumberField(t.numberOfHours, this._number_of_hourly_forecasts, "number_of_hourly_forecasts", 1, 24)}
            <ul class="switches">
              ${this.renderSwitchOption(t.wind, this._hourly_wind, "hourly_wind")}
              ${this._hourly_wind ? this.renderSwitchOption(t.windGusts, this._hourly_wind_gust, "hourly_wind_gust") : ""}
              ${this.renderSwitchOption(t.precipitation, this._hourly_precipitation, "hourly_precipitation")}
              ${this.renderSwitchOption(t.humidity, this._hourly_humidity, "hourly_humidity")}
              ${this.renderSwitchOption(t.windArrow, this._hourly_wind_icons, "hourly_wind_icons")}
            </ul>
          ` : ""}

          ${this.renderSectionHeader(t.dailyForecast, this._daily_forecast, "daily_forecast")}
          ${this._daily_forecast ? html`
            ${this.renderNumberField(t.numberOfDays, this._number_of_daily_forecasts, "number_of_daily_forecasts", 1, 14)}
            <ul class="switches">
              ${this.renderSwitchOption(t.wind, this._daily_wind, "daily_wind")}
              ${this._daily_wind ? this.renderSwitchOption(t.windGusts, this._daily_wind_gust, "daily_wind_gust") : ""}
              ${this.renderSwitchOption(t.precipitation, this._daily_precipitation, "daily_precipitation")}
              ${this.renderSwitchOption(t.humidity, this._daily_humidity, "daily_humidity")}
            </ul>
          ` : ""}

          ${this.renderSensorPicker(t.rainRisk, this._rainChanceEntity, "rainChanceEntity")}
          ${this.renderSensorPicker(t.uv, this._uvEntity, "uvEntity")}
          ${this.renderSensorPicker(t.cloudCover, this._cloudCoverEntity, "cloudCoverEntity")}
          ${this.renderSensorPicker(t.freezeRisk, this._freezeChanceEntity, "freezeChanceEntity")}
          ${this.renderSensorPicker(t.snowRisk, this._snowChanceEntity, "snowChanceEntity")}
          ${this.renderSensorPicker(t.weatherAlert, this._alertEntity, "alertEntity")}
          ${this.renderSensorPicker(t.oneHourRain, this._rainForecastEntity, "rainForecastEntity")}
          <div class="section-header"><span>${t.iconsDir}</span></div>
          ${this.renderTextField(t.iconsDirPath, this._icons, "icons")}

          ${this.renderActionSection(t.tapAction, this._tap_action, "tap_action")}
          ${this.renderActionSection(t.holdAction, this._hold_action, "hold_action")}
          ${this.renderActionSection(t.doubleTapAction, this._double_tap_action, "double_tap_action")}
        </div>
      </div>
    `;
  }

  renderTextField(label, state, configAttr) {
    return html`
      <ha-textfield
        label="${label}"
        .value="${state}"
        .configValue=${configAttr}
        @input=${this._valueChanged}
      ></ha-textfield>
    `;
  }

  renderNumberField(label, value, configAttr, min, max) {
    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{ number: { min, max, step: 1, mode: "box" } }}
        .value=${value}
        .label=${label}
        @value-changed=${(ev) => this._numberChanged(ev, configAttr)}
      ></ha-selector>
    `;
  }

  renderWeatherPicker(label, entity, configAttr) { return this.renderPicker(label, entity, configAttr, "weather"); }
  renderSensorPicker(label, entity, configAttr) { return this.renderPicker(label, entity, configAttr, "sensor"); }
  renderPicker(label, entity, configAttr, domain) {
    return html`
      <ha-entity-picker
        label="${label}"
        .hass="${this.hass}"
        .value="${entity}"
        .configValue="${configAttr}"
        .includeDomains=${[domain]}
        @change="${this._valueChanged}"
        allow-custom-entity
      ></ha-entity-picker>
    `;
  }

  renderSectionHeader(label, state, configAttr) {
    return html`
      <div class="section-header">
        <span>${label}</span>
        <ha-switch
          .checked=${state}
          .configValue="${configAttr}"
          @change="${this._valueChanged}"
        ></ha-switch>
      </div>
    `;
  }

  renderSwitchOption(label, state, configAttr) {
    return html`
      <li class="switch">
        <ha-switch
          .checked=${state}
          .configValue="${configAttr}"
          @change="${this._valueChanged}"
        ></ha-switch>
        <span>${label}</span>
      </li>
    `;
  }

  renderActionSection(label, action, configKey) {
    const value = (action && action.action && action.action !== "none") ? action : undefined;
    return html`
      <div class="section-header"><span>${label}</span></div>
      <div @closed=${(ev) => ev.stopPropagation()}
           @dialog-closed=${(ev) => ev.stopPropagation()}
           @opened=${(ev) => ev.stopPropagation()}
           @iron-overlay-closed=${(ev) => ev.stopPropagation()}
           @iron-overlay-opened=${(ev) => ev.stopPropagation()}>
        <ha-selector
          .hass=${this.hass}
          .selector=${{ "ui-action": {} }}
          .value=${value}
          @value-changed=${(ev) => { ev.stopPropagation(); this._actionChanged(ev, configKey); }}
        ></ha-selector>
      </div>
    `;
  }

  _actionChanged(ev, configKey) {
    if (!this._config || !this.hass) return;
    const newAction = ev.detail.value;
    if (!newAction || newAction.action === "none") {
      const newConfig = { ...this._config };
      delete newConfig[configKey];
      this._config = newConfig;
    } else {
      this._config = { ...this._config, [configKey]: newAction };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  _numberChanged(ev, configAttr) {
    if (!this._config || !this.hass) return;
    this._config = { ...this._config, [configAttr]: ev.detail.value };
    fireEvent(this, "config-changed", { config: this._config });
  }

  _weatherEntityChanged(weatherEntityName) {
    const weatherEntityNameFull = "weather." + weatherEntityName;
    const state = this.hass.states[weatherEntityNameFull];
    if (state !== undefined) {
      const friendly_name = state.attributes.friendly_name;
      this._config = { ...this._config, ["name"]: friendly_name || "" };
      
      const entity = this.hass.entities[weatherEntityNameFull];
      const parent_device_id = entity?.device_id;
      if (parent_device_id) {
        Object.keys(this.hass.entities).forEach(entityName => {
          const ent = this.hass.entities[entityName];
          if (ent?.device_id === parent_device_id && entityName.includes("_weather_alert")) {
            this._config = { ...this._config, ["alertEntity"]: entityName };
          }
        });
      }
    }

    DefaultSensors.forEach((sensorSuffix, configAttribute) => {
      const entity = "sensor." + weatherEntityName + sensorSuffix;
      if (this.hass.states[entity] !== undefined) {
        this._config = { ...this._config, [configAttribute]: entity };
      }
    });
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue];
      } else {
        if (target.configValue === "entity")
          this._weatherEntityChanged(target.value.split(".")[1]);
        this._config = {
          ...this._config,
          [target.configValue]: target.checked !== undefined ? target.checked : target.value,
        };
      }
      fireEvent(this, "config-changed", { config: this._config });
    }
  }

  static get styles() {
    return css`
      .switches { margin: 8px 0; display: flex; flex-flow: row wrap; list-style: none; padding: 0; }
      .switch { display: flex; align-items: center; width: 50%; height: 40px; }
      .switches span { padding: 0 16px; }
      .section-header { display: flex; align-items: center; justify-content: space-between; font-weight: bold; padding: 8px 0 4px; border-top: 1px solid var(--divider-color); margin-top: 8px; }
      ha-textfield { display: block; width: 100%; margin-bottom: 8px; }
      ha-selector { display: block; margin-bottom: 8px; }
    `;
  }
}

customElements.define("meteofrance-weather-card-editor", MeteofranceWeatherCardEditor);