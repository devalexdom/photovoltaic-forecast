const PhotovoltaicForecast = require("../dist/index");

PhotovoltaicForecast({
    location: "Barcelona, Catalonia, Spain",
    pvForecastUpdateInterval: 60,
    apiKey: "**********************",
    newPvForecastCallback: (pvForecast) => {
        console.log(pvForecast);
    },
    errorCallback: (error) => {//Handle errors
        console.error(error);
    },
})

PhotovoltaicForecast({
    location: "London",
    apiKey: "**********************"
}).getPvForecastNow().then((pvForecast => {
    console.log(pvForecast);
})).catch((error) => {//Handle errors
    console.error(error);
})