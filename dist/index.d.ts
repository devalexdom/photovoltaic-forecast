import { PhotovoltaicForecast_Methods, PhotovoltaicForecast_Parameters } from "./types";
declare const PhotovoltaicForecast: ({ location, pvForecastUpdateInterval, newPvForecastCallback, errorCallback, pvForecastDays, apiKey }: PhotovoltaicForecast_Parameters) => PhotovoltaicForecast_Methods;
export default PhotovoltaicForecast;
