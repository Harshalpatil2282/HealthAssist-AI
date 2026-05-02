import pandas as pd, warnings; warnings.filterwarnings('ignore')

# Hospital geo data
h = pd.read_excel('app/data/seeds/hospital_dataset_1500_rows.xlsx')
print('=== Hospital pincode/geo sample ===')
print(h[['name','city','state','pincode','lat','lng']].head(5).to_string())
print('Pincode range:', h['pincode'].min(), '-', h['pincode'].max())
print('Unique cities:', sorted(h['city'].unique()))
print('Null lats:', h['lat'].isna().sum())
print('Null lngs:', h['lng'].isna().sum())
print()

# Check AllIndiaPinCode.xls - pincode to city mapping
print('=== AllIndiaPinCode.xls ===')
pin = pd.read_excel('app/data/seeds/AllIndiaPinCode.xls', nrows=5)
print('Cols:', list(pin.columns))
print(pin.head(3).to_string())

# pmjay packages
print()
print('=== pmjay_packages.csv ===')
pm = pd.read_csv('app/data/seeds/pmjay_packages.csv')
print('Cols:', list(pm.columns))
print(pm.head(3).to_string())

# icd10 procedures
print()
print('=== icd10_procedures.csv ===')
icd = pd.read_csv('app/data/seeds/icd10_procedures.csv')
print('Cols:', list(icd.columns))
print(icd.head(5).to_string())
