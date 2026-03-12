const LitElement = customElements.get("hui-masonry-view")
  ? Object.getPrototypeOf(customElements.get("hui-masonry-view"))
  : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const weatherIconsDay = {
  "clear": "day",
  "clear-night": "night",
  "cloudy": "cloudy",
  "fog": "fog",
  "hail": "rainy-7",
  "lightning": "thunder",
  "lightning-rainy": "lightning-rainy",
  "partlycloudy": "cloudy-day-3",
  "pouring": "rainy-6",
  "rainy": "rainy-5",
  "snowy": "snowy-6",
  "snowy-rainy": "snowy-rainy",
  "sunny": "day",
  "windy": "windy",
  "windy-variant": "windy",
  "exceptional": "!!",
};

const DefaultSensors = [
  ["detailEntity", "_rain_chance"],
  ["cloudCoverEntity", "_cloud_cover"],
  ["rainChanceEntity", "_rain_chance"],
  ["freezeChanceEntity", "_freeze_chance"],
  ["snowChanceEntity", "_snow_chance"],
  ["uvEntity", "_uv"],
  ["rainForecastEntity", "_next_rain"],
];

const weatherIconsNight = {
  ...weatherIconsDay,
  "clear": "night",
  "sunny": "night",
  "partlycloudy": "cloudy-night-3",
};

const translations = {
  "fr": {
    "conditions": {
      "clear": "Ciel dégagé",
      "clear-night": "Nuit claire",
      "cloudy": "Nuageux",
      "fog": "Brouillard",
      "hail": "Risque de grèle",
      "lightning": "Orages",
      "lightning-rainy": "Pluies orageuses",
      "partlycloudy": "Eclaircies",
      "pouring": "Pluie forte",
      "rainy": "Pluie",
      "snowy": "Neige",
      "snowy-rainy": "Pluie verglaçante",
      "sunny": "Ensoleillé",
      "windy": "Venteux",
      "windy-variant": "Venteux variable",
      "exceptional": "Exceptionnel",
    },
    "conditionsNightOverride": {
      "sunny": "Nuit claire",
    },
    "windDirections": ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO","N"],
    "wind": "Vent",
    "windGust": "Rafales",
    "windGustMax": "Max.",
    "uvIndex": "Indice UV",
    "uvIndexUnit": "indice UV",
    "humidity": "Humidité",
    "pressure": "Pression atmosphérique",
    "sunrise": "Heure de lever",
    "sunset": "Heure de coucher",
    "noRainInHour": "Pas de pluie dans l'heure.",
    "rainNow": " actuellement.",
    "rainIn": " dans ",
    "entityNotAvailable": "Entité non disponible : ",
    "rainIntensity": {
      "Pluie faible": "Pluie faible",
      "Pluie modérée": "Pluie modérée",
      "Pluie forte": "Pluie forte",
    },
  },
  "en": {
    "conditions": {
      "clear": "Clear sky",
      "clear-night": "Clear night",
      "cloudy": "Cloudy",
      "fog": "Fog",
      "hail": "Hail",
      "lightning": "Thunderstorm",
      "lightning-rainy": "Rainy thunderstorm",
      "partlycloudy": "Partly cloudy",
      "pouring": "Heavy rain",
      "rainy": "Rain",
      "snowy": "Snow",
      "snowy-rainy": "Sleet",
      "sunny": "Sunny",
      "windy": "Windy",
      "windy-variant": "Variable wind",
      "exceptional": "Exceptional",
    },
    "conditionsNightOverride": {
      "sunny": "Clear night",
    },
    "windDirections": ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW","N"],
    "wind": "Wind",
    "windGust": "Gusts",
    "windGustMax": "Max.",
    "uvIndex": "UV index",
    "uvIndexUnit": "UV index",
    "humidity": "Humidity",
    "pressure": "Atmospheric pressure",
    "sunrise": "Sunrise",
    "sunset": "Sunset",
    "noRainInHour": "No rain in the next hour.",
    "rainNow": " now.",
    "rainIn": " in ",
    "entityNotAvailable": "Entity not available: ",
    "rainIntensity": {
      "Pluie faible": "Light rain",
      "Pluie modérée": "Moderate rain",
      "Pluie forte": "Heavy rain",
    },
  },
};

const rainForecastValues = new Map([
  ["Pas de valeur", 0.1],
  ["Temps sec", 0.1],
  ["Pluie faible", 0.4],
  ["Pluie modérée", 0.7],
  ["Pluie forte", 1],
]);

window.customCards = window.customCards || [];
window.customCards.push({
  "type": "meteofrance-weather-card",
  "name": "Carte Météo France par HACF",
  "description": "Carte pour l'intégration Météo France.",
  "preview": true,
  "documentationURL": "https://github.com/hacf-fr/lovelace-meteofrance-weather-card",
});

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    "bubbles": options.bubbles === undefined ? true : options.bubbles,
    "cancelable": Boolean(options.cancelable),
    "composed": options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("_config")) {
    return true;
  }

  const oldHass = changedProps.get("hass");
  if (oldHass) {
    const entityName = element._config.entity.split(".")[1];
    return (
      oldHass.states[element._config.entity] !==
        element.hass.states[element._config.entity] ||
      oldHass.states["sun.sun"] !== element.hass.states["sun.sun"] ||
      !DefaultSensors.every((sensor) => {
        const sensorName = "sensor." + entityName + sensor[1];
        return oldHass.states[sensorName] === element.hass.states[sensorName];
      })
    );
  }

  return true;
}

class MeteofranceWeatherCard extends LitElement {
  static get properties() {
    return {
      "_config": {},
      "_dailyForecastEvent": {},
      "_hourlyForecastEvent": {},
      "hass": {},
    };
  }

  static async getConfigElement() {
    await import("./meteofrance-weather-card-editor.js");
    return document.createElement("meteofrance-weather-card-editor");
  }

  static getStubConfig(hass, unusedEntities, allEntities) {
    let entity = this.getDefaultWeatherEntity(unusedEntities, allEntities);
    let entities = { entity };

    if (entity) {
      let sensors = this.getWeatherEntitiesFromEntity(
        hass,
        entity.split(".")[1],
        allEntities
      );
      entities = {
        ...entities,
        ...sensors,
      };
    }
    return entities;
  }

  static getDefaultWeatherEntity(unusedEntities, allEntities) {
    let entity = unusedEntities.find((eid) => eid.split(".")[0] === "weather");
    if (!entity) {
      entity = allEntities.find((eid) => eid.split(".")[0] === "weather");
    }
    return entity;
  }

  static getWeatherEntitiesFromEntity(hass, entityName, allEntities) {
    let entities = {};
    DefaultSensors.forEach((sensor) => {
      const sensorName = "sensor." + entityName + sensor[1];
      if (hass.states[sensorName] !== undefined) {
        const entry = allEntities[sensorName];
        if (entry) {
          entities = {
            ...entities,
            [sensor[0]]: sensorName,
          };
        }
      }
    });
    return entities;
  }

  isDailyForecast(forecast) {
    const diff =
      new Date(forecast[1].datetime) - new Date(forecast[0].datetime);
    return diff > 3600000;
  }

  // Upgrade config fields if necessary
  upgradeConfig(config) {
    const upgradedConfig = { ...config };
    if (this.hass !== undefined) {
      const stateObj = this.hass.states[config.entity];
      if (stateObj !== undefined && stateObj.attributes.forecast !== undefined) {
        // Deduce "daily_forecast" & "hourly_forecast" from deprecated "forecast"
        if (this.isDailyForecast(stateObj.attributes.forecast)) {
          if (config["forecast"] !== undefined && config["daily_forecast"] === undefined) {
            upgradedConfig["daily_forecast"] = config["forecast"];
            upgradedConfig["hourly_forecast"] = false;
          }
          if (config["number_of_forecasts"] !== undefined && config["number_of_daily_forecasts"] === undefined) {
            upgradedConfig["number_of_daily_forecasts"] = config["number_of_forecasts"];
          }
        }
        else {
          if (config["forecast"] !== undefined && config["hourly_forecast"] === undefined) {
            upgradedConfig["daily_forecast"] = false;
            upgradedConfig["hourly_forecast"] = config["forecast"];
          }
          if (config["number_of_forecasts"] !== undefined && config["number_of_hourly_forecasts"] === undefined) {
            upgradedConfig["number_of_hourly_forecasts"] = config["number_of_forecasts"];
          }
        }
      }
    }
    return upgradedConfig;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define a weather entity");
    }
    this._config = this.upgradeConfig(config);
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  isSelected(option) {
    return option === undefined || option === true;
  }

  getTranslations() {
    const lang = (this.hass.selectedLanguage || this.hass.language || "fr").split("-")[0];
    return translations[lang] || translations["fr"];
  }

  getTimeFormatOptions() {
    const timeFormat = this.hass.locale?.time_format;
    if (timeFormat === "12") return { "hour12": true };
    if (timeFormat === "24") return { "hour12": false };
    return {};
  }

  _unsubscribeDailyForecastEvents() {
    if (this._daily_subscribed) {
      this._daily_subscribed.then((unsub) => unsub());
      this._daily_subscribed = undefined;
    }
  }

  _unsubscribeHourlyForecastEvents() {
    if (this._hourly_subscribed) {
      this._hourly_subscribed.then((unsub) => unsub());
      this._hourly_subscribed = undefined;
    }
  }

  async _subscribeDailyForecastEvents() {
    this._unsubscribeDailyForecastEvents();
    if (
      !this.isConnected ||
      !this.hass ||
      !this._config ||
      !this.isSelected(this._config.daily_forecast)
    ) {
      return;
    }

    this._daily_subscribed = this.hass.connection.subscribeMessage(
      (event) => {
        this._dailyForecastEvent = event;
      },
      {
        "type": "weather/subscribe_forecast",
        "forecast_type": "daily",
        "entity_id": this._config.entity,
      }
    );
  }

  async _subscribeHourlyForecastEvents() {
    this._unsubscribeHourlyForecastEvents();
    if (
      !this.isConnected ||
      !this.hass ||
      !this._config ||
      !this.isSelected(this._config.hourly_forecast)
    ) {
      return;
    }

    this._hourly_subscribed = this.hass.connection.subscribeMessage(
      (event) => {
        this._hourlyForecastEvent = event;
      },
      {
        "type": "weather/subscribe_forecast",
        "forecast_type": "hourly",
        "entity_id": this._config.entity,
      }
    );
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this._config && this.hass) {
      this._subscribeDailyForecastEvents();
      this._subscribeHourlyForecastEvents();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeDailyForecastEvents();
    this._unsubscribeHourlyForecastEvents();
  }

  updated(changedProps) {
    if (!this.hass || !this._config) {
      return;
    }
    if (changedProps.has("_config") || !this._daily_subscribed) {
      this._subscribeDailyForecastEvents();
    }
    if (changedProps.has("_config") || !this._hourly_subscribed) {
      this._subscribeHourlyForecastEvents();
    }
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    this.numberElements = 0;

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      const t = this.getTranslations();
      return html`
        <ha-card>
          <div class="not-found">
            ${t.entityNotAvailable}${this._config.entity}
          </div>
        </ha-card>
      `;
    }

    const hasAction = this._config.tap_action || this._config.hold_action || this._config.double_tap_action;
    return html`
      <ha-card
        ?interactive=${!!hasAction}
        tabindex="${hasAction ? "0" : "-1"}"
        @click="${this._handleTap}"
        @keydown="${this._handleKeyDown}"
        @dblclick="${this._handleDoubleTap}"
        @pointerdown="${this._handlePointerDown}"
        @pointerup="${this._cancelHold}"
        @pointercancel="${this._cancelHold}"
      >
        ${this.isSelected(this._config.current)
          ? this.renderCurrent(stateObj)
          : ""}
        ${this.isSelected(this._config.details)
          ? this.renderDetails(stateObj)
          : ""}
        ${this.isSelected(this._config.alert_forecast)
          ? this.renderAlertForecast()
          : ""}
        ${this.isSelected(this._config.one_hour_forecast)
          ? this.renderOneHourForecast()
          : ""}
        ${this.isSelected(this._config.hourly_forecast)
          ? this.renderForecast(this._hourlyForecastEvent, this._config.number_of_hourly_forecasts)
          : ""}
        ${this.isSelected(this._config.daily_forecast)
          ? this.renderForecast(this._dailyForecastEvent, this._config.number_of_daily_forecasts)
          : ""}
      </ha-card>
    `;
  }

  renderCurrent(stateObj) {
    this.numberElements++;
    return html`
      <ul class="flow-row current">
        <li
          title="${this.getPhenomenaText(stateObj.state, this.isNightTime())}"
          style="background: none, url('${this.getWeatherIcon(
            stateObj.state.toLowerCase(),
            this.isNightTime()
          )}') no-repeat; background-size: contain;"
        ></li>
        <li>
          ${this.getPhenomenaText(stateObj.state, this.isNightTime())}
          ${this.isSelected(this._config.show_name)
            ? html`<div>${this._config.name !== undefined ? this._config.name : ""}</div>`
            : ""}
        </li>
        <li>
          ${this.isSelected(this._config.show_temperature) ? html`
            ${this._config.temperature_entity
              ? this.hass.states[this._config.temperature_entity]?.state
              : (this.getUnit("temperature") == "°F"
                  ? Math.round(stateObj.attributes.temperature)
                  : stateObj.attributes.temperature)}
            <sup>${this.getUnit("temperature")}</sup>
          ` : ""}
          <ul>
            ${this.renderMeteoFranceDetail(
              this.hass.states[this._config.detailEntity]
            )}
          </ul>
        </li>
      </ul>
    `;
  }

  renderDetails(stateObj) {
    const sun = this.hass.states["sun.sun"];
    const lang = this.hass.selectedLanguage || this.hass.language;
    const timeZone = this.hass.config.time_zone;
    const t = this.getTranslations();
    let next_rising;
    let next_setting;

    if (sun) {
      next_rising = new Date(sun.attributes.next_rising);
      next_setting = new Date(sun.attributes.next_setting);
    }

    this.numberElements++;

    return html`
      <div class="flow-row details-wrapper${this.numberElements > 1 ? " spacer" : ""}">
        <ul class="details-col">
          <!-- Cloudy -->
          ${this.renderMeteoFranceDetail(
            this.hass.states[this._config.cloudCoverEntity]
          )}
          <!-- Rain -->
          ${this.renderMeteoFranceDetail(
            this.hass.states[this._config.rainChanceEntity]
          )}
          <!-- Freeze -->
          ${this.renderMeteoFranceDetail(
            this.hass.states[this._config.freezeChanceEntity]
          )}
          <!-- Snow -->
          ${this.renderMeteoFranceDetail(
            this.hass.states[this._config.snowChanceEntity]
          )}
        </ul>
        <ul class="details-col details-col-right">
          <!-- Wind + Wind Gust -->
          <li>
            <ha-icon icon="mdi:weather-windy" title="${t.wind}"></ha-icon>
            ${(stateObj.attributes.wind_bearing == undefined
              ? " "
              : t.windDirections[
                  parseInt((stateObj.attributes.wind_bearing + 11.25) / 22.5)
                ] + " ") + stateObj.attributes.wind_speed} ${this.getUnit("speed")}
            ${stateObj.attributes.wind_gust_speed != undefined
              ? html`<div style="clear:both"><ha-icon icon="mdi:weather-windy-variant" title="${t.windGust}"></ha-icon>${this._config.wind_gust_zero_dash !== false && stateObj.attributes.wind_gust_speed == 0 ? "-" : `${stateObj.attributes.wind_gust_speed} ${this.getUnit("speed")} ${t.windGustMax}`}</div>`
              : ""}
          </li>
          <!-- Humidity -->
          ${this.renderDetail(
            stateObj.attributes.humidity,
            t.humidity,
            "mdi:water-percent",
            "%"
          )}
          <!-- Pressure -->
          ${this.renderDetail(
            stateObj.attributes.pressure,
            t.pressure,
            "mdi:gauge",
            this.getUnit("air_pressure")
          )}
          <!-- UV -->
          ${this.renderMeteoFranceDetail(this.hass.states[this._config.uvEntity], t.uvIndex, t.uvIndexUnit)}
        </ul>
      </div>
      <ul class="flow-row details">
        <!-- Sunset up -->
        ${this.isSelected(this._config.show_sun) && next_rising
          ? this.renderDetail(
              next_rising.toLocaleTimeString(lang, { "hour": "2-digit", "minute": "2-digit", "timeZone": timeZone, ...this.getTimeFormatOptions() }),
              t.sunrise,
              "mdi:weather-sunset-up"
            )
          : ""}
        <!-- Sunset down -->
        ${this.isSelected(this._config.show_sun) && next_setting
          ? this.renderDetail(
              next_setting.toLocaleTimeString(lang, { "hour": "2-digit", "minute": "2-digit", "timeZone": timeZone, ...this.getTimeFormatOptions() }),
              t.sunset,
              "mdi:weather-sunset-down"
            )
          : ""}
      </ul>
    `;
  }

  renderMeteoFranceDetail(entity, labelOverride, unitOverride) {
    return entity !== undefined
      ? this.renderDetail(
          entity.state,
          labelOverride || entity.attributes.friendly_name,
          entity.attributes.icon,
          unitOverride !== undefined ? unitOverride : entity.attributes.unit_of_measurement
        )
      : "";
  }

  renderDetail(state, label, icon, unit) {
    return html`
      <li>
        <ha-icon icon="${icon}" title="${label}"></ha-icon>
        ${state} ${unit ? html`${unit}` : ""}
      </li>
    `;
  }

  renderOneHourForecast() {
    const rainForecast = this.hass.states[this._config.rainForecastEntity];

    if (!rainForecast || rainForecast.length === 0) {
      return html``;
    }

    this.numberElements++;

    let [startTime, endTime] = this.getOneHourForecastTime(rainForecast);

    return html` <ul
        class="flow-row oneHourHeader ${this.numberElements > 1
          ? " spacer"
          : ""}"
      >
        <li>${startTime}</li>
        <li>${this.getOneHourNextRainText(rainForecast)}</li>
        <li>${endTime}</li>
      </ul>
      <ul class="flow-row oneHour">
        ${html`
          ${this.getOneHourForecast(rainForecast).map(
            (forecast) => html` <li
              class="rain-${forecast[0]}min"
              style="opacity: ${forecast[1]}"
              title="${forecast[2]}"
            ></li>`
          )}
        `}
      </ul>
      <ul class="flow-row oneHourLabel">
        <li></li>
        <li>10</li>
        <li>20</li>
        <li>30</li>
        <li>40</li>
        <li>50</li>
      </ul>`;
  }

  renderAlertForecast() {
    const alertForecast = this.hass.states[this._config.alertEntity];

    if (!alertForecast) {
      return html``;
    }

    const alerts = this.getAlertForecast(alertForecast);

    if (alerts.length == 0) return html``;

    this.numberElements++;

    return html` <div
      class="flow-row alertForecast ${this.numberElements > 1 ? " spacer" : ""}"
    >
      ${alerts.map(
        (phenomenon) => html` <div class="alertForecast${phenomenon.color}">
          <ha-icon
            icon="${phenomenon.icon}"
            title="${phenomenon.name}"
          ></ha-icon>
        </div>`
      )}
    </div>`;
  }

  renderForecast(forecast, number_of_forecasts) {
    if (!forecast || !forecast.forecast || forecast.forecast.length === 0) {
      return html``;
    }

    const lang = this.hass.selectedLanguage || this.hass.language;
    const isDaily = forecast.type === "daily" ;

    this.numberElements++;
    return html`  <div style="overflow-x:auto;"> <ul
      class="flow-row forecast ${this.numberElements > 1 ? " spacer" : ""}"
    >
      ${forecast.forecast
        .slice(
          0,
          number_of_forecasts
            ? number_of_forecasts
            : 5
        )
        .map((daily) => this.renderDailyForecast(daily, lang, isDaily))}
    </ul></div>`;
  }

  renderDailyForecast(daily, lang, isDaily) {
    const p = isDaily ? "daily_" : "hourly_";
    const cfg = {
      "details":       this.isSelected(this._config[p + "details"]),
      "wind":          this.isSelected(this._config[p + "wind"]),
      "windGust":      this.isSelected(this._config[p + "wind_gust"]),
      "precipitation": this.isSelected(this._config[p + "precipitation"]),
      "humidity":      this.isSelected(this._config[p + "humidity"]),
      "windIcons":     this.isSelected(this._config[p + "wind_icons"]),
    };
    return html` <li>
      <ul class="flow-column day">
        <li>
          ${isDaily
            ? new Date(daily.datetime).toLocaleDateString(lang, {
                weekday: "short",
                day: "numeric",
                timeZone: this.hass.config.time_zone,
              })
            : new Date(daily.datetime).toLocaleTimeString(lang, {
                "hour": "2-digit",
                "minute": "2-digit",
                "timeZone": this.hass.config.time_zone,
                ...this.getTimeFormatOptions(),
              })}
        </li>
        <li
          class="icon"
          title="${this.getPhenomenaText(daily.condition, !isDaily && this.isNightTime(daily.datetime))}"
          style="background: none, url('${this.getWeatherIcon(
            daily.condition.toLowerCase(),
            !isDaily && this.isNightTime(daily.datetime)
          )}') no-repeat; background-size: contain"
        ></li>
        <li class="highTemp">
          ${daily.temperature} ${this.getUnit("temperature")}
        </li>
        ${daily.templow !== undefined
          ? html`
              <li class="lowTemp">
                ${daily.templow} ${this.getUnit("temperature")}
              </li>
            `
          : ""}
        ${cfg.precipitation && cfg.details &&
        daily.precipitation !== undefined && daily.precipitation !== null
          ? html`
              <li class="precipitation">
                ${Math.round(daily.precipitation * 10) / 10}
                ${this.getUnit("precipitation")}
              </li>
            `
          : ""}
        ${cfg.humidity && cfg.details &&
        daily.humidity !== undefined && daily.humidity !== null
          ? html`
              <li class="humidity">
                ${Math.round(daily.humidity)}
                ${this.getUnit("humidity")}
              </li>
            `
          : ""}
        ${cfg.precipitation &&
        daily.precipitation_probability !== undefined && daily.precipitation_probability !== null
          ? html`
              <li class="precipitation_probability">
                ${Math.round(daily.precipitation_probability)}
                ${this.getUnit("precipitation_probability")}
              </li>
            `
          : ""}
        ${cfg.wind && cfg.details &&
        daily.wind_speed !== undefined && daily.wind_speed !== null
          ? html`
              <li class="wind_speed">
                ${Math.round(daily.wind_speed)} ${this.getUnit("speed")}
              </li>
            `
          : ""}
        ${cfg.wind && cfg.windGust && cfg.details && daily.wind_gust_speed !== undefined && daily.wind_gust_speed !== null
          ? html`
              <li class="wind_gust_speed">
                ${this._config.wind_gust_zero_dash !== false && Math.round(daily.wind_gust_speed) === 0
                  ? "-"
                  : `${Math.round(daily.wind_gust_speed)} ${this.getUnit("speed")}`}
              </li>
            `
          : ""}
        ${cfg.windIcons && daily.wind_bearing !== undefined && daily.wind_bearing !== null
          ? html`
              <li class="icon"
                style="background: none, url('/local/community/lovelace-meteofrance-weather-card/icons/arrow-north-static.svg'); background-size: contain; transform: rotate(${daily.wind_bearing + 180}deg) scale(0.5)">
              </li>
            `
          : ""}
        ${cfg.windIcons && daily.wind_bearing !== undefined && daily.wind_bearing == null
          ? html`
              <li class="icon"
                style="background: none, url('/local/community/lovelace-meteofrance-weather-card/icons/no-wind-bearing-static.svg'); background-size: contain; transform: scale(0.5)">
              </li>
            `
          : ""}
      </ul>
    </li>`;
  }

  isNightTime(datetimehourly) {
    const sun = this.hass.states["sun.sun"];
    if (!sun) {
      return false;
    }

    let nextrising = new Date(sun.attributes.next_rising);
    let nextsetting = new Date(sun.attributes.next_setting);

    const thistime = datetimehourly ? new Date(datetimehourly) : new Date();

    return (
      (thistime > nextsetting && thistime < nextrising) ||
      (thistime < nextsetting &&
        thistime < nextrising &&
        nextrising < nextsetting)
    );
  }

  getOneHourForecast(rainForecastEntity) {
    let rainForecastList = [];
    for (let [time, value] of Object.entries(
      rainForecastEntity.attributes["1_hour_forecast"]
    )) {
      if (time != undefined && time.match(/[0-9]*min/g)) {
        time = time.replace("min", "").trim();
        rainForecastList.push([time, rainForecastValues.get(value), value]);
      }
    }

    return rainForecastList;
  }

  getOneHourForecastTime(rainForecastEntity) {
    const lang = this.hass.selectedLanguage || this.hass.language;
    const timeZone = this.hass.config.time_zone;
    let rainForecastTimeRef = new Date(
      rainForecastEntity.attributes["forecast_time_ref"]
    );
    const timeFormatOptions = this.getTimeFormatOptions();
    let rainForecastStartTime = rainForecastTimeRef.toLocaleTimeString(lang, {
      "hour": "2-digit",
      "minute": "2-digit",
      "timeZone": timeZone,
      ...timeFormatOptions,
    });
    rainForecastTimeRef.setHours(rainForecastTimeRef.getHours() + 1);
    let rainForecastEndTime = rainForecastTimeRef.toLocaleTimeString(lang, {
      "hour": "2-digit",
      "minute": "2-digit",
      "timeZone": timeZone,
      ...timeFormatOptions,
    });

    return [rainForecastStartTime, rainForecastEndTime];
  }

  getOneHourNextRainText(rainForecastEntity) {
    const t = this.getTranslations();
    for (let [time, value] of Object.entries(
      rainForecastEntity.attributes["1_hour_forecast"]
    )) {
      if (time != undefined && rainForecastValues.get(value) > 0.1) {
        let timeStr = time.replace(/([345])5/g, "$10");
        const label = t.rainIntensity[value] || value;
        return label + (time == "0 min" ? t.rainNow : t.rainIn + timeStr + ".");
      }
    }

    return t.noRainInHour;
  }

  getAlertForecast(alertEntity) {
    let phenomenaList = [];

    if (alertEntity == undefined) {
      return [];
    }

    if (
      !this._config.hide_alertVentViolent &&
      alertEntity.attributes["Vent violent"]
    ) {
      phenomenaList.push({
        "name": "Vent violent",
        "icon": "mdi:weather-windy",
        "color": alertEntity.attributes["Vent violent"],
      });
    }

    if (
      !this._config.hide_alertPluieInondation &&
      alertEntity.attributes["Pluie-inondation"]
    ) {
      phenomenaList.push({
        "name": "Pluie-inondation",
        "icon": "mdi:weather-pouring",
        "color": alertEntity.attributes["Pluie-inondation"],
      });
    }

    if (!this._config.hide_alertOrages && alertEntity.attributes["Orages"]) {
      phenomenaList.push({
        "name": "Orages",
        "icon": "mdi:weather-lightning",
        "color": alertEntity.attributes["Orages"],
      });
    }

    if (
      !this._config.hide_alertInondation &&
      alertEntity.attributes["Inondation"]
    ) {
      phenomenaList.push({
        "name": "Inondation",
        "icon": "mdi:home-flood",
        "color": alertEntity.attributes["Inondation"],
      });
    }

    if (
      !this._config.hide_alertNeigeVerglas &&
      alertEntity.attributes["Neige-verglas"]
    ) {
      phenomenaList.push({
        "name": "Neige-verglas",
        "icon": "mdi:weather-snowy-heavy",
        "color": alertEntity.attributes["Neige-verglas"],
      });
    }

    if (
      !this._config.hide_alertCanicule &&
      alertEntity.attributes["Canicule"]
    ) {
      phenomenaList.push({
        "name": "Canicule",
        "icon": "mdi:weather-sunny-alert",
        "color": alertEntity.attributes["Canicule"],
      });
    }

    if (
      !this._config.hide_alertGrandFroid &&
      alertEntity.attributes["Grand-froid"]
    ) {
      phenomenaList.push({
        "name": "Grand-froid",
        "icon": "mdi:snowflake",
        "color": alertEntity.attributes["Grand-froid"],
      });
    }

    if (
      !this._config.hide_alertAvalanches &&
      alertEntity.attributes["Avalanches"]
    ) {
      phenomenaList.push({
        "name": "Avalanches",
        "icon": "mdi:image-filter-hdr",
        "color": alertEntity.attributes["Avalanches"],
      });
    }

    if (
      !this._config.hide_alertVaguesSubmersion &&
      alertEntity.attributes["Vagues-submersion"]
    ) {
      phenomenaList.push({
        "name": "Vagues-submersion",
        "icon": "mdi:waves",
        "color": alertEntity.attributes["Vagues-submersion"],
      });
    }

    return phenomenaList;
  }

  getWeatherIcon(condition, isNight) {
    return `${
      this._config.icons
        ? this._config.icons
        : "/local/community/lovelace-meteofrance-weather-card/icons/"
    }${isNight ? weatherIconsNight[condition] : weatherIconsDay[condition]}${
      this.isSelected(this._config.animated_icons) ? "" : "-static"
    }.svg`;
  }

  getPhenomenaText(phenomena, isNight) {
    const t = this.getTranslations();
    const text = isNight
      ? (t.conditionsNightOverride[phenomena] || t.conditions[phenomena])
      : t.conditions[phenomena];
    return text || phenomena;
  }

  getUnit(measure) {
    const lengthUnit = this.hass.config.unit_system.length;
    switch (measure) {
      case "air_pressure":
        return lengthUnit === "km" ? "hPa" : "inHg";
      case "length":
        return lengthUnit;
      case "precipitation":
        return lengthUnit === "km" ? "mm" : "in";
      case "precipitation_probability":
        return "%";
	  case "humidity":
        return "%";
      case "speed":
        return lengthUnit === "km" ? "km/h" : "mph";
      default:
        return this.hass.config.unit_system[measure] || "";
    }
  }

  _executeAction(action) {
    if (!action || action.action === "none") return;
    switch (action.action) {
      case "more-info":
        fireEvent(this, "hass-more-info", { entityId: action.entity || this._config.entity });
        break;
      case "navigate":
        window.history.pushState(null, "", action.navigation_path);
        fireEvent(window, "location-changed");
        break;
      case "url":
        window.open(action.url_path, "_blank");
        break;
      case "perform-action":
      case "call-service": {
        const serviceStr = action.action_name || action.service || "";
        const [domain, service] = serviceStr.split(".");
        this.hass.callService(domain, service, action.service_data || action.data || {}, action.target);
        break;
      }
      case "toggle":
        this.hass.callService("homeassistant", "toggle", { entity_id: this._config.entity });
        break;
      case "fire-dom-event":
        fireEvent(this, action.event_type, action.event_data || {});
        break;
    }
  }

  _handleTap() {
    if (this._holdFired) { this._holdFired = false; return; }
    if (this._config.double_tap_action) {
      this._tapTimer = window.setTimeout(() => {
        this._tapTimer = null;
        this._executeAction(this._config.tap_action || { action: "more-info" });
      }, 250);
    } else {
      this._executeAction(this._config.tap_action || { action: "more-info" });
    }
  }

  _handleDoubleTap(e) {
    e.preventDefault();
    if (this._tapTimer) { clearTimeout(this._tapTimer); this._tapTimer = null; }
    this._executeAction(this._config.double_tap_action);
  }

  _handlePointerDown() {
    if (!this._config.hold_action) return;
    this._holdTimer = window.setTimeout(() => {
      this._holdFired = true;
      this._holdTimer = null;
      this._executeAction(this._config.hold_action);
    }, 500);
  }

  _cancelHold() {
    if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
  }

  _handleKeyDown(ev) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._handleTap();
    }
  }

  getCardSize() {
    return 3;
  }

  static get styles() {
    return css`
      ha-card {
        margin: auto;
        overflow: hidden;
        padding: 0.5em 1em;
        position: relative;
      }

      ha-card[interactive] {
        cursor: pointer;
      }

      .not-found {
        flex: 1;
        background-color: var(--warning-color, #f9ca24);
        color: var(--primary-text-color);
        padding: 8px;
        border-radius: 4px;
      }

      ha-card ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .spacer {
        padding-top: 1em;
      }

      .clear {
        clear: both;
      }

      .flow-row {
        display: flex;
        flex-flow: row wrap;
      }

      .flow-column {
        display: flex;
        flex-flow: column wrap;
      }

      .ha-icon {
        height: 0.8em;
        margin-right: 5px;
        color: var(--state-icon-color);
      }

      /* Current Forecast */
      .current {
        flex-wrap: nowrap;
      }

      .current > *:first-child {
        min-width: 100px;
        height: 100px;
        margin-right: 10px;
      }

      .current > *:last-child {
        margin-left: auto;
        min-width: max-content;
        text-align: right;
      }

      .current > *:last-child sup {
        font-size: initial;
      }

      .current > li {
        font-size: 2em;
        line-height: 1.2;
        align-self: center;
      }

      .current > li > *:last-child {
        line-height: 1;
        font-size: 0.6em;
        color: var(--secondary-text-color);
      }

      /* Details */
      .details {
        justify-content: space-between;
        font-weight: 300;
      }

      .details > li {
        flex-basis: auto;
        width: 50%;
      }

      .details > li:nth-child(2n) {
        text-align: right;
      }

      .details > li:nth-child(2n) ha-icon {
        margin-right: 0;
        margin-left: 8px;
        float: right;
      }

      .details-wrapper {
        display: flex;
        justify-content: space-between;
        font-weight: 300;
      }

      .details-col {
        width: 50%;
        padding: 0;
        margin: 0;
        list-style: none;
      }

      .details-col ha-icon {
        height: 22px;
        margin-right: 5px;
        color: var(--state-icon-color);
      }

      .details-col-right {
        text-align: right;
      }

      .details-col-right li {
        overflow: hidden;
      }

      .details-col-right ha-icon {
        margin-right: 0;
        margin-left: 8px;
        float: right;
      }

      /* One Hour Forecast */
      .oneHour {
        height: 1em;
      }

      .oneHour > li {
        background-color: var(--state-icon-color);
        border-right: 1px solid
          var(--lovelace-background, var(--primary-background-color));
      }

      .oneHour > li:first-child {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
      }

      .oneHour > li:last-child {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
        border: 0;
      }

      /* One Hour Labels */
      .rain-0min,
      .rain-5min,
      .rain-10min,
      .rain-15min,
      .rain-20min,
      .rain-25min {
        flex: 1 1 0;
      }

      .rain-35min,
      .rain-45min,
      .rain-55min {
        flex: 2 1 0;
      }

      .oneHourLabel > li {
        flex: 1 1 0;
      }

      /* One Hour Header */
      .oneHourHeader {
        justify-content: space-between;
      }

      .oneHourHeader li:last-child {
        text-align: right;
      }

      /* Alert */
      .alertForecast {
        text-align: center;
        flex-wrap: nowrap;
      }

      .alertForecast > div {
        flex: 1;
        border: 0;
        border-radius: 5px;
        margin-left: 1px;
        margin-right: 1px;
      }

      .alertForecastVert {
        border: 2px solid var(--success-color, #4CAF50);
        color: var(--success-color, #4CAF50);
      }

      .alertForecastJaune {
        background-color: #f9ca24;
        color: #333;
      }

      .alertForecastOrange {
        background-color: #f0932b;
        color: #fff;
      }

      .alertForecastRouge {
        background-color: #eb4d4b;
        color: #fff;
      }

      /* Forecast */
      .forecast {
        justify-content: space-between;
        flex-wrap: nowrap;
      }

      .forecast > li {
        flex: 1;
        border-right: 0.1em solid var(--divider-color, #d9d9d9);
      }

      .forecast > *:last-child {
        border-right: 0;
      }

      .forecast ul.day {
        align-items: center;
        width: 8ch;
      }

      .forecast ul.day > *:first-child {
        text-transform: uppercase;
      }

      .forecast ul.day .highTemp {
        font-weight: bold;
      }

      .forecast ul.day .lowTemp {
        color: var(--secondary-text-color);
      }

      .forecast ul.day .icon {
        width: 50px;
        height: 50px;
        margin-right: 5px;
      }
    `;
  }
}
customElements.define("meteofrance-weather-card", MeteofranceWeatherCard);
