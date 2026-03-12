# Translation API Documentation

Use this guide to integrate translation features in the Samvad frontend.

---

## Base URL

```
http://localhost:5000/api
```

(Use your deployed URL in production.)

---

## Endpoints

### 1. Get Supported Languages

**`GET /api/complaints/languages`**

Returns all languages available for translation.

| | |
|---|---|
| **Auth** | Not required |
| **Method** | GET |

**Response**
```json
{
  "languages": [
    { "code": "en", "name": "English" },
    { "code": "hi", "name": "Hindi" },
    { "code": "es", "name": "Spanish" },
    { "code": "bn", "name": "Bengali" },
    ...
  ]
}
```

**Frontend usage**
- Populate a language selector dropdown.
- Use `code` when calling translate or create-complaint APIs.

---

### 2. Get Complaint Categories

**`GET /api/complaints/categories`**

Returns valid categories for complaints (used in dropdowns and auto-categorization).

| | |
|---|---|
| **Auth** | Not required |
| **Method** | GET |

**Response**
```json
{
  "categories": ["Infrastructure", "Utilities", "Sanitation", "Roads", "Security", "Public Health", "Environment", "Education", "Transport", "Other"]
}
```

---

### 3. Auto-Categorize from Description (AI)

**`POST /api/complaints/categorize`**

Uses AI (OpenAI or Gemini) or keyword matching to suggest a category from the complaint description.

| | |
|---|---|
| **Auth** | Not required |
| **Method** | POST |
| **Content-Type** | application/json |

**Request body**
```json
{ "description": "Water supply is broken for 3 days" }
```

**Response (200)**
```json
{
  "category": "Utilities",
  "source": "openai"
}
```

`source` can be `"openai"`, `"gemini"`, or `"keyword"` (fallback when no API key).

**Setup:** Add `OPENAI_API_KEY` or `GEMINI_API_KEY` to `.env` for AI categorization. Without them, keyword fallback is used.

**Frontend: "Select category" that updates from description**
- Initial: show `GET /categories` → use `defaultLabel: "Select category"` as placeholder
- On `description` (or `title`) change (debounced ~300ms): call `POST /categorize` with `{ description }`
- Update dropdown to show the returned `category` as suggested/selected (user can override)
- Category is optional on submit; backend auto-categorizes if empty

---

### 4. Translate Preview (Hindi→English, etc.)

**`POST /api/complaints/translate-preview`**

Batch translate complaint fields for **live preview** (e.g. when user types Hindi, show English preview).

| | |
|---|---|
| **Auth** | Not required |
| **Method** | POST |
| **Content-Type** | application/json |

**Request body**
```json
{
  "title": "सड़क की समस्या",
  "description": "मेरे क्षेत्र में गड्ढे हैं",
  "category": "",
  "location": "Block A",
  "targetLanguage": "en",
  "sourceLanguage": "auto"
}
```

**Response (200)**
```json
{
  "original": { "title": "सड़क की समस्या", "description": "मेरे क्षेत्र में गड्ढे हैं", ... },
  "translated": {
    "title": "Road Issue",
    "description": "I have potholes in my area",
    "category": "",
    "location": "Block A"
  },
  "targetLanguage": "en",
  "sourceLanguage": "auto"
}
```

Use `sourceLanguage: "auto"` so Hindi text is detected and translated to English correctly.

---

### 5. Translate Text

**`POST /api/complaints/translate`**

Translates a single text string.

| | |
|---|---|
| **Auth** | Not required |
| **Method** | POST |
| **Content-Type** | application/json |

**Request body**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to translate |
| `targetLanguage` | string | No | `"en"` | Target language code (e.g., `"hi"`, `"es"`) |
| `sourceLanguage` | string | No | `"en"` | Source language code |

**Example request**
```json
{
  "text": "My water supply is broken",
  "targetLanguage": "hi",
  "sourceLanguage": "en"
}
```

**Response (200)**
```json
{
  "original": "My water supply is broken",
  "translated": "मेरा पानी का सप्लाई खराब हो गई है",
  "targetLanguage": "hi",
  "sourceLanguage": "en"
}
```

**Error (400)**
```json
{
  "message": "Text to translate is required"
}
```

**Error (500)**
```json
{
  "message": "Translation failed"
}
```

**Frontend usage**
- Live preview of translated text before submitting.
- Translate a single field (e.g., description) on demand.

---

### 3. Create Complaint (with optional translation)

**`POST /api/complaints/create`**

Creates a complaint. Translation happens when: (1) `targetLanguage` is provided, or (2) **title/description contain Hindi** — in that case they are auto-translated to English.

| | |
|---|---|
| **Auth** | Required (JWT token) |
| **Method** | POST |
| **Content-Type** | application/json |
| **Authorization** | Raw JWT token (see auth section below) |

**Request body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Complaint title |
| `description` | string | Yes | Complaint description |
| `category` | string | No | Category; auto-detected from description if omitted |
| `location` | string | Yes | Location |
| `targetLanguage` | string | No | If provided, all fields are translated to this language |
| `sourceLanguage` | string | No | Source language (default: `"en"`) |

**Example request (with translation)**
```json
{
  "title": "Broken street light",
  "description": "Light not working for 2 days",
  "category": "Infrastructure",
  "location": "Main Street",
  "targetLanguage": "hi",
  "sourceLanguage": "en"
}
```

**Response (200)**
```json
{
  "message": "Complaint submitted successfully",
  "complaint": {
    "title": "स्ट्रीट लाइट टूटी हुई है",
    "description": "2 दिनों तक लाइट काम नहीं कर रही है",
    "category": "इन्फ़्रास्ट्रक्चर",
    "location": "मुख्य सड़क",
    "status": "Pending",
    "translatedLanguage": "hi"
  }
}
```

**Without translation** (omit `targetLanguage`):
```json
{
  "message": "Complaint submitted successfully",
  "complaint": {
    "title": "Broken street light",
    "description": "Light not working for 2 days",
    "category": "Infrastructure",
    "location": "Main Street",
    "status": "Pending"
  }
}
```

Complaints are saved to MongoDB and linked to the logged-in user.

---

### 4. Get My Complaints

**`GET /api/complaints/my`**

Returns all complaints for the logged-in user.

| | |
|---|---|
| **Auth** | Required |
| **Method** | GET |

**Response (200)**
```json
{
  "complaints": [
    {
      "_id": "...",
      "title": "...",
      "description": "...",
      "category": "...",
      "location": "...",
      "status": "Pending",
      "translatedLanguage": "hi",
      "user": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

## Authentication

### Login to get token

**`POST /api/auth/login`**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Sending the token

For protected routes like `POST /api/complaints/create`, send the token in the `Authorization` header. Both formats work:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# or raw token:
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Language Codes Reference

| Code | Language |
|------|----------|
| `en` | English |
| `hi` | Hindi |
| `bn` | Bengali |
| `gu` | Gujarati |
| `kn` | Kannada |
| `ml` | Malayalam |
| `mr` | Marathi |
| `pa` | Punjabi |
| `ta` | Tamil |
| `te` | Telugu |
| `ur` | Urdu |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `ar` | Arabic |
| `zh` | Chinese |
| `ja` | Japanese |
| `ko` | Korean |
| `pt` | Portuguese |
| `ru` | Russian |
| `it` | Italian |
| `nl` | Dutch |
| `pl` | Polish |
| `tr` | Turkish |
| `vi` | Vietnamese |
| `th` | Thai |

---

## Frontend Integration Examples

### React / JavaScript

```javascript
const API_BASE = 'http://localhost:5000/api';

// Fetch languages for dropdown
async function getLanguages() {
  const res = await fetch(`${API_BASE}/complaints/languages`);
  const data = await res.json();
  return data.languages; // [{ code, name }, ...]
}

// Translate text (e.g., for live preview)
async function translateText(text, targetLang, sourceLang = 'en') {
  const res = await fetch(`${API_BASE}/complaints/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      targetLanguage: targetLang,
      sourceLanguage: sourceLang
    })
  });
  const data = await res.json();
  return data.translated;
}

// Create complaint with translation
async function createComplaint(complaint, token, targetLang = null) {
  const body = {
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    location: complaint.location
  };
  if (targetLang) {
    body.targetLanguage = targetLang;
    body.sourceLanguage = complaint.sourceLanguage || 'en';
  }

  const res = await fetch(`${API_BASE}/complaints/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`  // or token alone
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
```

### Form flow suggestion

1. Add a language selector (populated from `GET /complaints/languages`).
2. Optional: Call `POST /complaints/translate` for a live preview.
3. On submit, call `POST /complaints/create` with `targetLanguage` set to the selected language.
