/**
 * AirCast — every fact the case study shows. Checked against the repository
 * (aahilafraz123/aircast-nasa-hackathon, HEAD 9d45132): backend/*, frontend/*,
 * the git history and the README. Team project — Allen's parts come from git.
 */

export const LINKS = [{ href: 'https://github.com/aahilafraz123/aircast-nasa-hackathon', label: 'Repository' }];

export const COPY = {
  outcome:
    'One map that answers “is it safe to go outside right now, and when will it be better?” — NASA satellite data, ground stations and weather, fused in a 27-hour hackathon.',
  status: 'Hackathon build · NASA Space Apps 2025 Global Nominee',
  before: [
    'Satellite readings, sparse ground stations and the weather all live in different places',
    'An air-quality number means nothing to a parent or a coach on its own',
    'The same AQI is fine for a healthy adult and risky for a child',
    'A satellite file is a grid of molecules per square centimetre, not an answer for a street',
  ],
  after: [
    'NASA TEMPO NO₂, OpenAQ stations and OpenWeather on one dark map',
    'A six-step forecast where every step says why it moved',
    'Five groups — children, seniors, athletes, adults, care facilities — each with its own safe window',
    'The nearest satellite pixel, converted to an AQI and labelled with how old it is',
  ],
  built:
    'Built by a two-person team (Team Relentless) in about 27 hours of commits, 4–5 Oct 2025. Allen wrote the AI brief and chat, the per-group safety engine, the forecast explanations, getting the satellite file onto Azure, and the deploy pipeline (19 of the 27 hackathon commits); Aahil Afraz wrote the OpenAQ and TEMPO readers, the forecast multipliers and most of the map UI.',
  next: [
    'Fetch the latest TEMPO granule every hour from NASA Earthdata — today one pinned granule from 4 Oct 2025 is used, and the app says so.',
    'Cache the granule instead of downloading it on every request (twice per page load today).',
    'Store chat sessions in a database instead of process memory.',
    'Add the tests the deploy pipeline has a placeholder for.',
  ],
  headlines: {
    problem: 'Three data sources, five kinds of people, and no one answering the simple question.',
    how: 'From a satellite pixel to “go outside at 3 pm” — seven steps, one request each.',
    inside: 'A forecast that explains itself, safety per person, and an AI that only speaks from live readings.',
    decisions: 'Three problems that came from real data and a real deploy, not a tutorial.',
    architecture: 'One Flask app, three data sources and a model — follow a page load through it.',
    build: 'Twenty-seven hours of commits, then a nominee badge.',
    next: 'What a production AirCast would add.',
  },
};

export const FLOW = {
  caption: 'One page load, step by step',
  figureCaption: 'From space to a street-level answer',
  steps: [
    { key: 'locate', label: 'Locate', title: 'Where are you?', body: 'The browser’s geolocation (or a geocoded search) sets the point every API call uses. Philadelphia is only the default.', facts: ['All 8 /api routes take lat and lon', 'Default 39.9526, −75.1652'] },
    { key: 'ground', label: 'Ground stations', title: 'What the sensors on the ground say', body: 'OpenAQ v3 returns stations within 25 km; the first five are read and their PM2.5 is converted to an AQI with the EPA’s piecewise-linear breakpoints.', facts: ['radius=25000, up to 20 locations, 5 read', 'PM2.5 → AQI: 12.0 / 35.4 / 55.4 / 150.4 / 250.4 µg/m³ → 50 / 100 / 150 / 200 / 300'] },
    { key: 'satellite', label: 'Satellite', title: 'What NASA TEMPO saw', body: 'The TEMPO L2 NO₂ granule is fetched from Azure Blob, opened in memory as NetCDF, and the pixel nearest to you is found with a vectorised distance and argmin.', facts: ['One granule, observed 2025-10-04 16:44:23 UTC', 'Nearest pixel: |Δlat| + |Δlon| → argmin → unravel_index', 'Column → ppb → AQI with a hand-tuned scale'] },
    { key: 'weather', label: 'Weather', title: 'Wind, heat, rain and humidity', body: 'OpenWeather gives the current reading and the next eight 3-hour slots — the drivers the forecast multiplies by.', facts: ['/weather + /forecast?cnt=8, imperial units', 'Falls back to fixed readings if the key or request fails'] },
    { key: 'forecast', label: 'Forecast', title: 'Six steps, each with a reason', body: 'Readable multiplier rules move the AQI step by step — strong wind lowers it, heat and rush hour raise it — and each step returns a sentence saying why.', facts: ['Wind >15 mph ×0.75 · >10 ×0.85 · >5 ×0.92', 'Temp >85°F ×1.20 · >75 ×1.10 · rain ×0.65 · humidity >80% ×1.05', 'Rush hour 7–9 / 16–19 ×1.15 · night ×0.95'] },
    { key: 'safety', label: 'Safety by group', title: 'One AQI, five different answers', body: 'Each step is judged against five groups’ thresholds; every group gets its status, a recommendation, and its best window in the next six steps.', facts: ['Facilities safe <45 · children and seniors <50 · athletes <75 · adults <100', 'Best = lowest AQI among that group’s safe steps'] },
    { key: 'brief', label: 'AI brief', title: 'A plain-English answer, grounded in the readings', body: 'Every reading above is written into a structured context and GPT-4o-mini turns it into an A–F style brief under 180 words; a chat answers follow-ups from the same context.', facts: ['gpt-4o-mini · brief max_tokens 300 · chat 200', 'Any failure returns a friendly fallback with HTTP 200'] },
  ],
};

export const FEATURES = [
  { key: 'forecast', label: 'Forecast', title: 'Explainable, not a black box', body: 'Nine multiplier rules across five drivers, each step tagged “improving due to strong winds dispersing pollution” or similar. Honest about its limits: it isn’t trained, adds ±5 noise, and its steps sit on 3-hour weather slots.', stat: { value: '9', label: 'rules across 5 drivers' } },
  { key: 'safety', label: 'Safety', title: 'A guide for each kind of person', body: 'Children and seniors, athletes, adults and care facilities each have safe / caution / unsafe bands and their own recommendation — “Cancel outdoor practice, move indoors or reschedule”.', stat: { value: '5', label: 'groups × 3 statuses' } },
  { key: 'compare', label: 'Satellite vs ground', title: 'Two views of the same air', body: 'A card compares the satellite-derived AQI with the ground stations’ as a percent agreement — and says plainly that one is NO₂ from orbit and the other PM2.5 at street level.', stat: { value: '2', label: 'independent sources' } },
  { key: 'fresh', label: 'Provenance', title: 'Honest about stale data', body: 'Every satellite response carries its observation time, age and a status ladder — Fresh, Recent, Moderate, Cached — and the UI shows a notice that NASA’s data updates were paused.', stat: { value: '4', label: 'freshness states' } },
];

export const DECISIONS = [
  {
    id: 'granule',
    kicker: 'Cloud',
    title: 'A satellite file that only worked on one laptop',
    problem: 'The first TEMPO reader opened the granule from a Windows Downloads folder, and the file was too large to commit — so the deployed app had no way to reach it.',
    decision: 'Allen moved it to Azure Blob storage and opened it straight from memory: download over HTTPS, wrap the bytes, hand them to NetCDF, read the geolocation and product groups. The URL can be overridden with an environment variable.',
    tradeoff: 'No disk dependency on the server — but the granule is downloaded on every request (twice per page load), which is why Gunicorn runs with a 600-second timeout. Caching it is the obvious next step.',
    caption: 'Getting the granule to the cloud',
    steps: ['Hard-coded C:\\Users\\…\\Downloads path → a relative backend/data path', 'Granule removed from git (too large)', 'Uploaded to Azure Blob: aircasttempo/tempo-data', 'Fetched over HTTPS and opened in memory with netCDF4', 'Nearest pixel → AQI → freshness envelope'],
    readout: 'Commits d8079be → bef385e → c70f41c, all by Allen.',
    code: {
      file: 'backend/api/tempo.py',
      lang: 'python',
      body: `TEMPO_BLOB_URL = os.getenv('TEMPO_BLOB_URL',
    'https://aircasttempo.blob.core.windows.net/tempo-data/TEMPO_NO2_L2_V04_20251004T164423Z_S007G03.nc')

response = requests.get(TEMPO_BLOB_URL, timeout=30)
response.raise_for_status()
file_data = BytesIO(response.content)
dataset = nc.Dataset('tempo-memory', mode='r', memory=file_data.read())
lat = dataset.groups['geolocation'].variables['latitude'][:]
lon = dataset.groups['geolocation'].variables['longitude'][:]
no2 = dataset.groups['product'].variables['vertical_column_troposphere'][:]`,
    },
  },
  {
    id: 'grounded',
    kicker: 'AI',
    title: 'An AI that only speaks from the live readings — and survives without a key',
    problem: 'A generic chatbot would make up conditions. And during the deploy, a missing or invalid OpenAI key crashed the whole app on boot.',
    decision: 'Every brief and chat call builds a structured context from all sources — location, AQI, pollutants, weather, the six forecast steps with their reasons, the satellite reading — and the system prompt keeps the model to that. The client is created inside try/except, and every AI route returns HTTP 200 with fallback text when anything fails.',
    tradeoff: 'Each AI call repeats every upstream fetch, including a satellite download; chat history lives in process memory and replays the last four exchanges.',
    caption: 'What goes into one brief',
    steps: ['OpenAQ stations → current AQI and pollutants', 'OpenWeather current + 8 forecast slots', 'Six forecast steps, each with its reason', 'TEMPO AQI for the nearest pixel', 'System prompt: A–F grade, timing advice, one health tip, under 180 words', 'gpt-4o-mini → brief, or a fallback with HTTP 200'],
    readout: 'Written by Allen in dd47cf2; made optional on boot in 81d3f30.',
    code: {
      file: 'backend/app.py',
      lang: 'python',
      body: `try:
    openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
except Exception as e:
    openai_client = None   # the map keeps working without the AI

# ...in /api/ai-summary
except Exception as e:
    return jsonify({"status": "partial", "summary": fallback_summary,
                    "error": str(e)}), 200`,
    },
  },
  {
    id: 'groups',
    kicker: 'Safety',
    title: 'One number, five answers',
    problem: 'An AQI of 80 is fine for a healthy adult and a reason to keep children inside. A single colour can’t say that.',
    decision: 'Allen wrote a per-group safety engine: five groups with their own safe and caution thresholds, run over every forecast step, then each group’s best window (the lowest AQI among its safe steps) and the overall worst.',
    tradeoff: 'The thresholds are hand-picked, and “worst” is the same hour for every group.',
    caption: 'Thresholds by group (safe below · caution below)',
    steps: ['Care facilities — safe < 45 · caution < 90', 'Children — safe < 50 · caution < 100', 'Seniors — safe < 50 · caution < 100', 'Athletes — safe < 75 · caution < 125', 'Adults — safe < 100 · caution < 150'],
    readout: 'models/user_groups.py (all 125 lines) and the best/worst windows in /api/safety-groups — commit 36fc3fc.',
    code: {
      file: 'backend/app.py',
      lang: 'python',
      body: `for group_key in group_keys:
    safe_hours = [f for f in forecast_safety
                  if f['groups'][group_key]['status'] == 'safe']
    best_hour = min(safe_hours, key=lambda x: x['aqi']) if safe_hours \\
        else min(forecast_safety, key=lambda x: x['aqi'])
    worst_hour = max(forecast_safety, key=lambda x: x['aqi'])`,
    },
  },
];

export const LAYERS = [
  { key: 'who', label: 'Who', nodes: ['user'] },
  { key: 'app', label: 'Browser', nodes: ['map', 'chat'] },
  { key: 'domain', label: 'Flask API', nodes: ['api', 'forecast', 'safety', 'ai'] },
  { key: 'data', label: 'Readers', nodes: ['tempo', 'openaq', 'weather'] },
  { key: 'out', label: 'Outside', nodes: ['blob', 'openaq-api', 'openweather', 'openai'] },
];

export const TRACES = [
  { id: 'brief', label: 'Get the AI brief', steps: ['user', 'map', 'api', 'openaq', 'weather', 'forecast', 'tempo', 'blob', 'ai', 'openai'] },
  { id: 'safety', label: 'Safe windows by group', steps: ['user', 'map', 'api', 'openaq', 'weather', 'forecast', 'safety'] },
  { id: 'compare', label: 'Satellite vs ground', steps: ['user', 'map', 'api', 'tempo', 'blob', 'openaq', 'openaq-api'] },
];
