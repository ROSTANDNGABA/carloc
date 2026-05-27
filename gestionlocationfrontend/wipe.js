const fs = require('fs');

const files = [
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/components/client/accueil/client-dashboard-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/modules/auth/inscription/register-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/modules/auth/login/login-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/modules/client/client-shell.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/modules/client/components/catalogue/catalogue-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/modules/client/components/facture/invoices-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/modules/client/components/profil/client-profile-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/modules/client/components/reservation/client-reservations-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/shared/home/public-home-page.component.ts',
  'C:/Users/TOUT EN UN/Desktop/CARLOC/gestionlocationfrontend/src/app/shared/navbar/public-shell.component.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace template
    content = content.replace(/template:\s*`[\s\S]*?`,/, "template: `<div></div>`,");
    
    // Replace styles
    content = content.replace(/styles:\s*\[[\s\S]*?\]/g, "styles: []");
    
    fs.writeFileSync(file, content);
    console.log(`Wiped ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
