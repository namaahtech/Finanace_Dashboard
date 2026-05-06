const fs = require('fs');
const path = 'd:/Finanace_Dashboard/src/app/admin/users/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Use regex to find the catch block regardless of whitespace
const regex = /catch\s*\(err:\s*any\)\s*{\s*showToast\(err\.response\?\.data\?\.error\s*\|\|\s*err\.message,\s*"error"\);\s*}\s*finally\s*{/g;

let match;
let occurrences = [];
while ((match = regex.exec(content)) !== null) {
    occurrences.push({
        index: match.index,
        length: match[0].length
    });
}

console.log(`Found ${occurrences.length} occurrences.`);

if (occurrences.length >= 2) {
    // Replace the last one (handleDelete)
    const last = occurrences[occurrences.length - 1];
    const newDeleteCatch = `} catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      if (msg.includes("updated_at") || msg.includes("500") || msg.includes("42703")) {
        showToast("System Block: This employee is a Team Lead or assigned to projects. Please apply the SQL fix in Supabase before deleting.", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {`;
    
    // Replace the first one (handleSubmit)
    const first = occurrences[0];
    const newSubmitCatch = `} catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      if (msg.includes("updated_at") || msg.includes("500")) {
        showToast("Configuration Error: Database triggers are misconfigured. Please run the SQL patch in your Supabase dashboard.", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {`;

    // We must replace from back to front to not shift indices
    let newContent = content.substring(0, last.index) + newDeleteCatch + content.substring(last.index + last.length);
    newContent = newContent.substring(0, first.index) + newSubmitCatch + newContent.substring(first.index + first.length);
    
    fs.writeFileSync(path, newContent);
    console.log("Successfully patched both catch blocks using regex.");
} else {
    console.log("Could not find enough occurrences to patch.");
}
