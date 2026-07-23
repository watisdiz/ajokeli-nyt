const now = () => new Date().toISOString();

const feature = (id, name, coordinates) => ({
  type: "Feature",
  id,
  geometry: { type: "Point", coordinates },
  properties: {
    id,
    name,
    collectionStatus: "GATHERING",
    state: "OK",
    dataUpdatedTime: now(),
  },
});

const sensor = (id, stationId, name, value, unit, descriptionFi) => ({
  id,
  stationId,
  name,
  shortName: name,
  measuredTime: now(),
  value,
  unit,
  reliability: "OK",
  sensorValueDescriptionFi: descriptionFi,
});

export const demoMetadata = {
  type: "FeatureCollection",
  dataUpdatedTime: now(),
  features: [
    feature(1001, "Tie 1 Espoo, Sepänkylä", [24.68, 60.19]),
    feature(1002, "Tie 3 Vantaa, Keimola", [24.82, 60.32]),
    feature(1003, "Tie 4 Lahti, Renkomäki", [25.64, 60.93]),
    feature(1004, "Tie 9 Tampere, Alasjärvi", [23.86, 61.51]),
    feature(1005, "Tie 4 Oulu, Kaakkuri", [25.52, 64.96]),
    feature(1006, "Tie 5 Kuopio, Päiväranta", [27.66, 62.95]),
  ],
};

export const demoMeasurements = {
  dataUpdatedTime: now(),
  stations: [
    {
      id: 1001,
      dataUpdatedTime: now(),
      sensorValues: [
        sensor(1, 1001, "ILMA", 18.4, "°C"),
        sensor(3, 1001, "TIE_1", 22.1, "°C"),
        sensor(27, 1001, "KELI_1", 1, "***", "Kuiva"),
        sensor(22, 1001, "SADE", 0, "///", "Pouta"),
        sensor(26, 1001, "NÄKYVYYS_KM", 20, "km"),
        sensor(17, 1001, "MAKSIMITUULI", 5.2, "m/s"),
      ],
    },
    {
      id: 1002,
      dataUpdatedTime: now(),
      sensorValues: [
        sensor(1, 1002, "ILMA", 1.4, "°C"),
        sensor(3, 1002, "TIE_1", 0.6, "°C"),
        sensor(27, 1002, "KELI_1", 3, "***", "Märkä"),
        sensor(22, 1002, "SADE", 1, "///", "Heikko sade"),
        sensor(26, 1002, "NÄKYVYYS_KM", 6, "km"),
        sensor(17, 1002, "MAKSIMITUULI", 8, "m/s"),
      ],
    },
    {
      id: 1003,
      dataUpdatedTime: now(),
      sensorValues: [
        sensor(1, 1003, "ILMA", -2.1, "°C"),
        sensor(3, 1003, "TIE_1", -3.2, "°C"),
        sensor(27, 1003, "KELI_1", 6, "***", "Lumi"),
        sensor(25, 1003, "SATEEN_OLOMUOTO_PWDXX", 11, "///", "Lumisade"),
        sensor(26, 1003, "NÄKYVYYS_KM", 1.6, "km"),
        sensor(17, 1003, "MAKSIMITUULI", 13, "m/s"),
      ],
    },
    {
      id: 1004,
      dataUpdatedTime: now(),
      sensorValues: [
        sensor(1, 1004, "ILMA", -0.5, "°C"),
        sensor(3, 1004, "TIE_1", -1.6, "°C"),
        sensor(27, 1004, "KELI_1", 7, "***", "Jää"),
        sensor(25, 1004, "SATEEN_OLOMUOTO_PWDXX", 19, "///", "Jäätävä sade"),
        sensor(26, 1004, "NÄKYVYYS_KM", 0.4, "km"),
        sensor(17, 1004, "MAKSIMITUULI", 18, "m/s"),
      ],
    },
    {
      id: 1005,
      dataUpdatedTime: now(),
      sensorValues: [
        sensor(1, 1005, "ILMA", -8.1, "°C"),
        sensor(3, 1005, "TIE_1", -10.2, "°C"),
        sensor(27, 1005, "KELI_1", 1, "***", "Kuiva"),
        sensor(22, 1005, "SADE", 0, "///", "Pouta"),
        sensor(26, 1005, "NÄKYVYYS_KM", 18, "km"),
        sensor(17, 1005, "MAKSIMITUULI", 7, "m/s"),
      ],
    },
    {
      id: 1006,
      dataUpdatedTime: new Date(Date.now() - 35 * 60_000).toISOString(),
      sensorValues: [
        {
          ...sensor(3, 1006, "TIE_1", -1, "°C"),
          measuredTime: new Date(Date.now() - 35 * 60_000).toISOString(),
        },
      ],
    },
  ],
};

export const demoCameras = {
  type: "FeatureCollection",
  dataUpdatedTime: now(),
  features: [],
};
