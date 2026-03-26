const fs = require('fs');
const path = require('path');

function rebrandFile(filePath) {
    console.log('Reading ' + filePath);
    let content = fs.readFileSync(filePath, 'utf8');

    // Branding (Case Sensitive)
    content = content.replace(/SoulMatch/g, 'AMARSIUNPO');
    
    // Lowercase branding
    content = content.replace(/soulmatch/g, 'amarsiunpo');

    // URLs and Paths
    content = content.replace(/soul-match/g, 'amarsiunpo');

    // Emails
    content = content.replace(/@soulmatch\.it/g, '@amarsiunpo.it');
    
    // Domain
    content = content.replace(/soulmatch\.it/g, 'amarsiunpo.it');
    content = content.replace(/soulmatch\.com/g, 'amarsiunpo.com');

    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
}

const base = 'c:\\Users\\Max\\Downloads\\A Codici Main\\SoulMatch-main\\SoulMatch-main\\src';
const filesToUpdate = [
    path.join(base, 'App.tsx'),
    path.join(base, 'SubscriptionComponents.tsx')
];

filesToUpdate.forEach(f => {
    rebrandFile(f);
});

console.log('Rebranding complete!');
