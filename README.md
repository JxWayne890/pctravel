# PC Fantasy Travel Website

Static, mobile-first booking website for PC Fantasy Travel.

## Pages

- `index.html` - homepage lead path, services, featured packages, social placeholders
- `plan-my-trip.html` - detailed custom vacation request form
- `vacation-packages.html` - filterable package library
- `cruises.html` - cruise planning page
- `group-trips.html` - group travel page
- `event-travel.html` - event travel page
- `travel-resources.html` - resources and downloadable checklist
- `about-pia.html` - About Pia Chaffin
- `become-a-travel-agent.html` - separate InteleTravel / PlanNet opportunity page
- `contact.html` - consultation calendar and quick request form
- `admin.html` - browser-based package editor and JSON export
- `policies.html` - privacy, terms, travel disclaimer, income disclaimer placeholders

## Editable Content

- Package data: `data/packages.js`
- CMS/export-friendly package JSON: `data/packages.json`
- Email templates: `data/email-templates.js`
- Integration endpoints: `assets/js/site-config.js`
- Vacation checklist: `resources/vacation-planning-checklist.txt`

The public package cards render from `data/packages.js`. The admin page stores edits in browser `localStorage` and can export JSON for a CMS, spreadsheet, or developer update. `data/packages.json` mirrors the starter package structure.

## Form and CRM Structure

Lead forms create structured payloads in `assets/js/site.js`. Each payload includes:

- Contact details
- Trip basics
- Travel styles
- Budget
- Preferences
- Package/vendor interest
- Required consent acknowledgements
- Lead tags such as `cruise`, `group`, `resort`, `event travel`, `custom package`, and `business opportunity`
- Client confirmation email copy
- Lead notification email copy

Set these values in `assets/js/site-config.js` for production:

```js
window.PC_INTEGRATIONS = {
  leadWebhookUrl: "https://your-email-service-webhook",
  googleSheetsWebhookUrl: "https://your-google-apps-script-webhook",
  crmWebhookUrl: "https://your-crm-webhook",
  consultationEmbedUrl: "https://your-scheduler-link"
};
```

With no endpoints configured, submissions show the confirmation message and save leads in browser `localStorage` for local testing.

## Launch Replacements

- Replace placeholder email and phone in footers.
- Replace `example.com` vendor links with live InteleTravel, Virgin Voyages, Carnival, PlanNet, and event-ticket links.
- Replace Facebook and Instagram links.
- Replace placeholder privacy policy and terms with final legal copy.
- Replace the placeholder income disclosure link before promoting the business opportunity.
