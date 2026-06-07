const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...appJson.expo,
  plugins: [
    ...(appJson.expo.plugins ?? []),
    [
      "@rnmapbox/maps",
      { RNMAPBOX_MAPS_DOWNLOAD_TOKEN: process.env.MAPBOX_DOWNLOADS_TOKEN ?? "" },
    ],
  ],
  extra: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN ?? "",
    router: {},
    eas: {
      projectId: "b9efe0ad-f55f-499f-847a-2bc7ddba19c8",
    },
  },
});
