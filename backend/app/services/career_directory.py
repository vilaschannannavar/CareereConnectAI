"""Curated directory and resolver for official company career pages without scraping."""
import urllib.parse
from typing import Optional, Dict

OFFICIAL_CAREER_PORTALS: Dict[str, str] = {
    "google": "https://careers.google.com",
    "alphabet": "https://careers.google.com",
    "tesla": "https://www.tesla.com/careers",
    "apple": "https://jobs.apple.com",
    "microsoft": "https://careers.microsoft.com",
    "amazon": "https://www.amazon.jobs",
    "meta": "https://www.metacareers.com",
    "facebook": "https://www.metacareers.com",
    "netflix": "https://jobs.netflix.com",
    "stripe": "https://stripe.com/jobs",
    "uber": "https://www.uber.com/us/en/careers",
    "airbnb": "https://careers.airbnb.com",
    "salesforce": "https://careers.salesforce.com",
    "nvidia": "https://www.nvidia.com/en-us/about-nvidia/careers",
    "intel": "https://jobs.intel.com",
    "cisco": "https://jobs.cisco.com",
    "oracle": "https://www.oracle.com/careers",
    "adobe": "https://careers.adobe.com",
    "spotify": "https://www.lifeatspotify.com",
    "snowflake": "https://careers.snowflake.com",
    "databricks": "https://www.databricks.com/company/careers",
    "palantir": "https://www.palantir.com/careers",
    "linkedin": "https://careers.linkedin.com",
    "twitter": "https://careers.x.com",
    "x": "https://careers.x.com",
    "snap": "https://careers.snap.com",
    "pinterest": "https://careers.pinterest.com",
    "lyft": "https://www.lyft.com/careers",
    "coinbase": "https://www.coinbase.com/careers",
    "robinhood": "https://robinhood.com/us/en/careers",
}


def resolve_official_career_page(company_name: str) -> str:
    """Resolve the official verified career portal URL for a company without scraping."""
    clean_name = company_name.strip().lower()
    
    # Direct match in curated verified directory
    if clean_name in OFFICIAL_CAREER_PORTALS:
        return OFFICIAL_CAREER_PORTALS[clean_name]

    # Partial prefix/token match
    tokens = clean_name.replace(",", " ").replace(".", " ").split()
    for token in tokens:
        if token in OFFICIAL_CAREER_PORTALS:
            return OFFICIAL_CAREER_PORTALS[token]

    # Deterministic safe search query directing candidate directly to the official company career portal
    query = f"{company_name} official careers job openings"
    return f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
