"""Quick endpoint smoke test."""
import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000', timeout=30) as c:
        tests = [
            ('GET',  '/api/v1/hospitals',             None),
            ('GET',  '/api/v1/hospitals/hosp-001',    None),
            ('GET',  '/api/v1/hospitals/hosp-999',    None),
            ('POST', '/api/v1/cost-estimate',         {'procedure_name': 'Total Knee Arthroplasty', 'city': 'Pune', 'hospital_tier': 'mid'}),
            ('POST', '/api/v1/pmjay-check',           {'state': 'Maharashtra', 'annual_income': 180000, 'ration_card_type': 'BPL', 'family_size': 4}),
            ('GET',  '/api/v1/drugs/compare?name=atorvastatin', None),
            ('POST', '/api/v1/triage',                {'symptoms': ['chest pain'], 'language': 'en'}),
            ('POST', '/api/v1/search',                {'query': 'knee replacement in Pune', 'language': 'en', 'location': {'pincode': '411001'}}),
        ]
        for method, url, body in tests:
            try:
                if method == 'GET':
                    r = await c.get(url)
                else:
                    r = await c.post(url, json=body)
                ok = 'OK' if r.status_code < 400 else 'FAIL'
                print(f'[{ok}] {method} {url} -> {r.status_code}')
                if r.status_code >= 400:
                    print('     Error:', r.text[:300])
            except Exception as e:
                print(f'[ERR] {method} {url} -> {e}')

asyncio.run(test())
