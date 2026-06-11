const selfsigned = require('selfsigned');
const { SignedXml } = require('xml-crypto');

console.log("selfsigned imported successfully");
console.log("SignedXml imported successfully");

(async () => {
  try {
    const attrs = [{ name: 'commonName', value: 'Namaah Test IdP' }];
    const pems = await selfsigned.generate(attrs, { days: 365, keySize: 2048 });
    console.log("pems keys:", Object.keys(pems));
    
    // Test XML signing
    const unsignedXml = `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_12345"><saml:Issuer>test</saml:Issuer></saml:Assertion>`;
    
    const sig = new SignedXml();
    sig.privateKey = pems.private;
    sig.publicCert = pems.cert;
    sig.addReference({
      xpath: "//*[local-name(.)='Assertion']",
      transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/2001/10/xml-exc-c14n#"],
      digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256"
    });
    
    // In xml-crypto, signatureAlgorithm defaults to rsa-sha1 unless configured.
    // Let's set it to rsa-sha256
    sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
    sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
    
    sig.computeSignature(unsignedXml);
    const signedXml = sig.getSignedXml();
    console.log("Signed XML Length:", signedXml.length);
    console.log("Signed XML Sample:", signedXml.substring(0, 300));
  } catch (err) {
    console.error("Failed to generate or sign:", err);
  }
})();
