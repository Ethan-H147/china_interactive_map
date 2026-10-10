# South African geographic telephone codes

Prepared 10 October 2026. The generator matches settlement IDs from the existing 500-place catalogue; it does not assign a code from an entire province, municipality, nearest city, or approximate telephone-area polygon.

## Sources

- ICASA [Numbering Plan Regulations, Table 3](https://www.icasa.org.za/uploads/files/NumberingPlanReg.pdf) defines the released geographic codes. ICASA's [numbering overview](https://www.icasa.org.za/pages/numbering) also confirms that 010 and 011 both indicate Johannesburg.
- Telkom [South African town dialling codes](https://ecdev2.telkom.co.za/corporate/customer-support/utilities/useful_information/sa_codes.html), saved as `telkom-sa-codes.html`: exact named town entries. Parenthesized province abbreviations disambiguate towns such as Middelburg and Heidelberg. Bilingual Somerset East/Oos and West/Wes entries are normalized.
- SAPS [national station contact directory](https://www.saps.gov.za/contacts/provdetails.php?pid=9SA), saved as `saps-contacts.html`: exact station locality and province, only when Telkom has no direct match. Mobile and non-geographic contact numbers are excluded. Each result links to the corresponding official station detail page.
- `audited-localities.json`: eight individually checked government facility references, including local fixed-line numbers for Soweto, Edendale, Nellmapius and Clermont. The evidence field records the relevant facility/address/number.

## Coverage and limitations

345 of 500 settlements have verified codes. The other 155 receive no phone card; `coverage.json` lists them for later research. Code 010 is included only where supported by the directory or local contact evidence; 011 is retained alongside it when both are documented. Domestic codes include the trunk zero (`012`); international prefixes remove it (`+27 12`). These are geographic fixed-line codes, not mobile prefixes or municipal borders.

The Department of Health's bulk medicine pickup-point contacts were investigated but rejected as a general matching source: several distant facilities share a central 021 provider number, and Edendale entries included a remote 031 contact. Only individually audited local numbers are retained. A municipal service telephone or centrally operated call centre alone is not enough to infer every settlement's code.

The generator checks source snapshot completeness, valid released codes, settlement IDs, major-city values, Johannesburg's 010/011 pair, and deterministic output. Run:

```text
node scripts/prepare-south-africa-phone-codes.mjs
node scripts/prepare-south-africa-phone-codes.mjs --check
```
