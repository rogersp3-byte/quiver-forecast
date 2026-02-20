export default async function handler(req, res) {
  const apiKey = process.env.STORMGLASS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Lahinch coordinates
  const lat = 52.9337;
  const lng = -9.3544;

  const params = [
    'waveHeight',
    'wavePeriod',
    'swellPeriod',
    'swellHeight',
    'swellDirection',
    'windSpeed',
    'windDirection',
    'waterTemperature'
  ].join(',');

  try {
    // Fetch wave/wind forecast
    const forecastUrl = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${params}`;
    const forecastRes = await fetch(forecastUrl, {
      headers: { Authorization: apiKey }
    });

    if (!forecastRes.ok) {
      const text = await forecastRes.text();
      return res.status(forecastRes.status).json({ error: text });
    }

    const forecastData = await forecastRes.json();

    // Fetch tide data
    const tideUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}`;
    const tideRes = await fetch(tideUrl, {
      headers: { Authorization: apiKey }
    });

    let tides = [];
    if (tideRes.ok) {
      const tideData = await tideRes.json();
      tides = tideData.data || [];
    }

    res.setHeader('Cache-Control', 's-maxage=1800'); // cache 30 mins
    return res.status(200).json({
      hours: forecastData.hours || [],
      tides
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
