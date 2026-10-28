import { WeatherForecastPage, type WeatherLocation } from "./weather-forecast-page";

const demoLocations: WeatherLocation[] = [{
  id: "nyc", city: "New York", state: "NY", country: "United States", localTime: "2:19 PM", timezone: "America/New_York", isMyLocation: true,
  detail: {
    temp: 72, condition: "Partly Cloudy", code: 2, isDay: true, high: 76, low: 61,
    hourly: Array.from({ length: 24 }, (_, i) => ({ time: `2026-10-23T${String((14 + i) % 24).padStart(2, "0")}:00`, temp: 66 + Math.round(7 * Math.sin(i / 4)), pop: i > 7 ? 15 : 0, windSpeed: 6 + i % 5 })),
    daily: Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-${String(23 + i).padStart(2, "0")}`, high: 72 + i % 4, low: 58 + i % 3, code: i === 3 ? 61 : 2, pop: i === 3 ? 45 : 0 })),
    airQuality: { aqi: 34, category: "Good" }, wind: { speed: 8, direction: 225, gust: 13 }, sunrise: "2026-10-23T07:13:00-04:00", sunset: "2026-10-23T18:02:00-04:00",
    uvIndex: 5, feelsLike: 74, humidity: 54, dewPoint: 55, precipitation: 10, precipitationNext24h: 0.12, visibility: 10, visibilityDescription: "Visibility is clear", pressure: 1016, pressureTrend: "rising", moon: { phase: "Waxing Crescent", illumination: 18 },
  },
}, { id: "long", city: "San Bernardino Valley", state: "California", localTime: "11:19 AM", detail: { temp: 86, condition: "Sunny", code: 0, isDay: true, high: 89, low: 64 } }];

const demoAdvice = [{ id: "jacket", label: "Bring a light jacket", icon: "cloud-sun" }, { id: "sunscreen", label: "Sunscreen", tone: "warn" as const }, { id: "sunglasses", label: "Sunglasses" }];
const demoAlert = { title: "Wind advisory until 8 PM", text: "Gusts up to 40 mph are likely this evening.", severity: "warn" as const };

/** ui-v0.5.323-weather.2 reference: clear-day drifting clouds, fixed location header actions, compact ordered detail tiles and content-sized hourly strip. */
export function WeatherForecastShowcase() {
  return <WeatherForecastPage locations={demoLocations} selectedId="nyc" advice={demoAdvice} alert={demoAlert} onRemoveLocation={() => {}} className="mx-auto max-w-6xl" />;
}
