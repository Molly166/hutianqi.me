# Experience Note Management

This is a local content-management workflow, not a visitor message board or a website admin panel. Each event lives in its own JSON file; there is no ever-growing central `entries` file.

## Adding an Event Manually

Create a JSON file in the appropriate module directory:

```text
src/data/experiences/
├── school/       Education
├── company/      Companies
├── internship/   Internships
├── work/         Work
├── life/         Life
└── watch/        Watch journal
```

Start the filename with the event date. Use `YYYY-MM-DD.json` when the date has one event. For multiple events on the same date, use `YYYY-MM-DD-01.json`, `YYYY-MM-DD-02.json`, and so on. The date in the filename must match the JSON `date` value. Events on the same date appear with the unsuffixed file first, followed by suffixed files in lexicographic order.

For example, an education event can be stored at:

```text
src/data/experiences/school/2023-09-12.json
```

The file contains one event object. Do not wrap it in an array or add `moduleId`:

```json
{
  "id": "school-2023-09-12",
  "date": "2023-09-12",
  "title": "First Day on Campus",
  "text": "Today marks the beginning of my university life.",
  "images": [
    {
      "src": "/images/experiences/school/2023-09-12/campus.jpg",
      "alt": "A campus photo taken on my first day"
    }
  ]
}
```

`moduleId` is inferred from the parent directory. The `id` is derived from the module and filename: `school/2023-09-12.json` must use `school-2023-09-12`, while `school/2023-09-12-01.json` must use `school-2023-09-12-01`. Updating the title, text, or images does not change the ID. Changing the date changes both the filename and ID.

The date must be a real calendar date in `YYYY-MM-DD` format. At least one of `title`, `text`, or `images` must contain valid content. An event may contain only text, only images, or both. All written content must be in English. Every image must include a site URL and meaningful `alt` text.

After adding a file manually, run these commands from the project root:

```bash
npm run experience -- list --module school
npm test
npm run build
```

These commands validate filenames, dates, modules, globally unique IDs, and content structure. Education and watch-journal detail pages already render their events. Other modules may store content now and connect it to pages later.

## Using the CLI

The CLI requires Node.js 22+. `--input` points to a local JSON file; relative paths are resolved from the current terminal directory.

```bash
# List the education module; omit --module to list every module
npm run experience -- list --module school
npm run experience -- list

# Add; note.json normally omits id because the command generates it
npm run experience -- add --module school --input note.json --dry-run
npm run experience -- add --module school --input note.json

# Update; patch.json contains only the date/title/text/images fields to change
npm run experience -- update --module school --id RECORD_ID --input patch.json --dry-run
npm run experience -- update --module school --id RECORD_ID --input patch.json

# Remove; provide both the correct module and current ID
npm run experience -- remove --module school --id RECORD_ID --dry-run
npm run experience -- remove --module school --id RECORD_ID
```

Add input accepts only `id`, `date`, `title`, `text`, and `images`. Omit `id` unless necessary; `date` is required. The command chooses the lowest available number for that date: the first event uses `YYYY-MM-DD.json` and `<module>-YYYY-MM-DD`; later events use `-01`, `-02`, and so on. If an ID is supplied, it must exactly match the ID that the command would generate. The returned `file` and `entry.id` are final. With the same directory state, dry-run and real execution return the same result.

Update input accepts only `date`, `title`, `text`, and `images`; it cannot set `id` directly or move an event between modules. Omitted fields remain unchanged. Use an empty string to clear the title or text, and use `images: []` to clear image references; do not use `null`. At least one valid content field must remain. When a date changes, the command first tries to preserve the event's same-day suffix. If that slot is occupied, it chooses the lowest available suffix on the new date and updates the ID. The output lists `previousId`, `previousFile`, and the new `entry.id` and `file`.

`--dry-run` performs the complete read, lookup, merge, and validation flow without creating, replacing, renaming, or deleting files. Use `--root /absolute/path/experiences` to test another data directory. The old single-file `--store` option has been removed.

Each real operation writes only the target event:

- Add writes a temporary file in the same directory before publishing the new event file; it never overwrites an existing file.
- Update verifies that the original file has not changed before atomically replacing it with the complete new JSON. A date change publishes the new file and removes the old one.
- Remove verifies that the original file has not changed, then deletes only that event JSON.
- A failed operation cleans up its temporary files and does not rewrite other events.

Run only one content-editing operation at a time, and do not edit the target file manually while a command is running.

## Adding Images

Store public images under:

```text
public/images/experiences/<moduleId>/<event filename without .json>/
```

Use a site-root path in `src`, such as `/images/experiences/school/2023-09-12/campus.jpg`. Do not use a local computer path such as `/Users/...`. Full `https://` and `http://` URLs are also supported. Relative paths, `//...`, `data:`, `blob:`, backslashes, and unencoded whitespace are rejected. Encode spaces in filenames as `%20`.

The CLI manages JSON references only; it does not upload, download, move, or delete image files:

- If an update omits `images`, the existing image list remains unchanged.
- `images: []` removes references only; it does not delete image files.
- Removing an event deletes only its JSON file, not its image directory.
- Changing an event date does not move images; existing `src` values and directories remain unchanged.

Before removing unused images, inspect all event references and confirm the exact assets separately to avoid deleting shared files.

## Providing Content to an Assistant

State the module, operation, and content directly. For example:

- "Education, add: September 12, 2023. The text is... Attach these two images."
- "Education, update: replace the second image for ID `xxx` with this image."
- "Life, remove: delete the note with ID `xxx`."

If a date contains several similar events, the assistant should confirm the target instead of guessing which one to remove. It must not invent a real date or experience when information is missing, or write test data into the production directory. Unless explicitly requested, it must not push or merge branches.
