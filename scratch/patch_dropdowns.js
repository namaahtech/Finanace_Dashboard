const fs = require('fs');
const path = 'd:/Finanace_Dashboard/src/app/admin/users/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `    const { data: teamsData } = await supabase.from("teams").select("id, name, type, parent_id");
    if (teamsData) setOrgTeams(teamsData);
    
    const { data: deptsData } = await supabase.from("departments").select("id, name");
    if (deptsData) setDepartments(deptsData);`;

const newBlock = `    const { data: teamsData } = await supabase.from("teams").select("id, name, type, parent_id");
    if (teamsData) {
      setOrgTeams(teamsData);
      setDepartments(teamsData.filter(t => t.type === 'department').map(t => ({ id: t.id, name: t.name })));
    }`;

// Replace ignoring line endings by splitting into lines
const lines = content.split(/\r?\n/);
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('await supabase.from("teams").select("id, name, type, parent_id")')) {
        startLine = i;
        break;
    }
}

if (startLine !== -1) {
    // Replace 5 lines
    lines.splice(startLine, 5, 
        '    const { data: teamsData } = await supabase.from("teams").select("id, name, type, parent_id");',
        '    if (teamsData) {',
        '      setOrgTeams(teamsData);',
        "      setDepartments(teamsData.filter(t => t.type === 'department').map(t => ({ id: t.id, name: t.name })));",
        '    }'
    );
    fs.writeFileSync(path, lines.join('\n'));
    console.log("Successfully patched loadOrg using line splice.");
} else {
    console.log("Could not find loadOrg function.");
}
