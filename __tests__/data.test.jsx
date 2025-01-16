const fs = require("fs");
const path = require("path");

describe('JSON test', () => {
    it('checks that the translation files are valid JSON', () => {
        const languages = ['en', 'ar'];

        for (const language of languages) {
            const dir = path.join(__dirname, '..', 'public', 'locales', language);
            const filenames = fs.readdirSync(dir);
            console.log(`Checking ${filenames.length} language files for ${language}`)

            for (const filename of filenames) {
                const filepath = path.join(dir, filename);
                var json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            }    
        }
    })
})
