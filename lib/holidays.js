// lib/holidays.js - Public Holiday Fetcher & Bundled Offline Datasets
import { Storage } from './storage.js';

export function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const TOP_COUNTRIES = [
  {
    "code": "CA",
    "name": "Canada"
  },
  {
    "code": "US",
    "name": "United States"
  },
  {
    "code": "TH",
    "name": "Thailand"
  }
];

export const OTHER_COUNTRIES = [
  {
    "code": "AR",
    "name": "Argentina"
  },
  {
    "code": "AM",
    "name": "Armenia"
  },
  {
    "code": "AU",
    "name": "Australia"
  },
  {
    "code": "AT",
    "name": "Austria"
  },
  {
    "code": "BY",
    "name": "Belarus"
  },
  {
    "code": "BE",
    "name": "Belgium"
  },
  {
    "code": "BO",
    "name": "Bolivia"
  },
  {
    "code": "BR",
    "name": "Brazil"
  },
  {
    "code": "BG",
    "name": "Bulgaria"
  },
  {
    "code": "CO",
    "name": "Colombia"
  },
  {
    "code": "HR",
    "name": "Croatia"
  },
  {
    "code": "CY",
    "name": "Cyprus"
  },
  {
    "code": "CZ",
    "name": "Czechia"
  },
  {
    "code": "DK",
    "name": "Denmark"
  },
  {
    "code": "EE",
    "name": "Estonia"
  },
  {
    "code": "FI",
    "name": "Finland"
  },
  {
    "code": "FR",
    "name": "France"
  },
  {
    "code": "DE",
    "name": "Germany"
  },
  {
    "code": "GR",
    "name": "Greece"
  },
  {
    "code": "GT",
    "name": "Guatemala"
  },
  {
    "code": "HU",
    "name": "Hungary"
  },
  {
    "code": "IS",
    "name": "Iceland"
  },
  {
    "code": "IN",
    "name": "India"
  },
  {
    "code": "IE",
    "name": "Ireland"
  },
  {
    "code": "IT",
    "name": "Italy"
  },
  {
    "code": "JP",
    "name": "Japan"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan"
  },
  {
    "code": "KE",
    "name": "Kenya"
  },
  {
    "code": "LV",
    "name": "Latvia"
  },
  {
    "code": "LI",
    "name": "Liechtenstein"
  },
  {
    "code": "LT",
    "name": "Lithuania"
  },
  {
    "code": "LU",
    "name": "Luxembourg"
  },
  {
    "code": "MT",
    "name": "Malta"
  },
  {
    "code": "MX",
    "name": "Mexico"
  },
  {
    "code": "MA",
    "name": "Morocco"
  },
  {
    "code": "NL",
    "name": "Netherlands"
  },
  {
    "code": "NZ",
    "name": "New Zealand"
  },
  {
    "code": "NG",
    "name": "Nigeria"
  },
  {
    "code": "NO",
    "name": "Norway"
  },
  {
    "code": "PA",
    "name": "Panama"
  },
  {
    "code": "PE",
    "name": "Peru"
  },
  {
    "code": "PH",
    "name": "Philippines"
  },
  {
    "code": "PL",
    "name": "Poland"
  },
  {
    "code": "PT",
    "name": "Portugal"
  },
  {
    "code": "RO",
    "name": "Romania"
  },
  {
    "code": "SM",
    "name": "San Marino"
  },
  {
    "code": "RS",
    "name": "Serbia"
  },
  {
    "code": "SG",
    "name": "Singapore"
  },
  {
    "code": "SK",
    "name": "Slovakia"
  },
  {
    "code": "SI",
    "name": "Slovenia"
  },
  {
    "code": "ZA",
    "name": "South Africa"
  },
  {
    "code": "KR",
    "name": "South Korea"
  },
  {
    "code": "ES",
    "name": "Spain"
  },
  {
    "code": "SE",
    "name": "Sweden"
  },
  {
    "code": "CH",
    "name": "Switzerland"
  },
  {
    "code": "TR",
    "name": "T\u00fcrkiye"
  },
  {
    "code": "UA",
    "name": "Ukraine"
  },
  {
    "code": "GB",
    "name": "United Kingdom"
  }
];

export const STATIC_HOLIDAYS = {
  "CA": {
    "2025": {
      "2025-01-01": {
        "date": "2025-01-01",
        "name": "New Year's Day",
        "localName": "New Year's Day"
      },
      "2025-04-18": {
        "date": "2025-04-18",
        "name": "Good Friday",
        "localName": "Good Friday"
      },
      "2025-05-19": {
        "date": "2025-05-19",
        "name": "Victoria Day",
        "localName": "Victoria Day"
      },
      "2025-07-01": {
        "date": "2025-07-01",
        "name": "Canada Day",
        "localName": "Canada Day"
      },
      "2025-09-01": {
        "date": "2025-09-01",
        "name": "Labour Day",
        "localName": "Labour Day"
      },
      "2025-09-30": {
        "date": "2025-09-30",
        "name": "National Day for Truth and Reconciliation",
        "localName": "National Day for Truth and Reconciliation"
      },
      "2025-10-13": {
        "date": "2025-10-13",
        "name": "Thanksgiving",
        "localName": "Thanksgiving"
      },
      "2025-11-11": {
        "date": "2025-11-11",
        "name": "Remembrance Day",
        "localName": "Remembrance Day"
      },
      "2025-12-25": {
        "date": "2025-12-25",
        "name": "Christmas Day",
        "localName": "Christmas Day"
      },
      "2025-12-26": {
        "date": "2025-12-26",
        "name": "Boxing Day",
        "localName": "Boxing Day"
      }
    },
    "2026": {
      "2026-01-01": {
        "date": "2026-01-01",
        "name": "New Year's Day",
        "localName": "New Year's Day"
      },
      "2026-04-03": {
        "date": "2026-04-03",
        "name": "Good Friday",
        "localName": "Good Friday"
      },
      "2026-05-18": {
        "date": "2026-05-18",
        "name": "Victoria Day",
        "localName": "Victoria Day"
      },
      "2026-07-01": {
        "date": "2026-07-01",
        "name": "Canada Day",
        "localName": "Canada Day"
      },
      "2026-09-07": {
        "date": "2026-09-07",
        "name": "Labour Day",
        "localName": "Labour Day"
      },
      "2026-09-30": {
        "date": "2026-09-30",
        "name": "National Day for Truth and Reconciliation",
        "localName": "National Day for Truth and Reconciliation"
      },
      "2026-10-12": {
        "date": "2026-10-12",
        "name": "Thanksgiving",
        "localName": "Thanksgiving"
      },
      "2026-11-11": {
        "date": "2026-11-11",
        "name": "Remembrance Day",
        "localName": "Remembrance Day"
      },
      "2026-12-25": {
        "date": "2026-12-25",
        "name": "Christmas Day",
        "localName": "Christmas Day"
      },
      "2026-12-26": {
        "date": "2026-12-26",
        "name": "Boxing Day",
        "localName": "Boxing Day"
      },
      "2026-12-28": {
        "date": "2026-12-28",
        "name": "Boxing Day (Observed)",
        "localName": "Boxing Day (Observed)"
      }
    },
    "2027": {
      "2027-01-01": {
        "date": "2027-01-01",
        "name": "New Year's Day",
        "localName": "New Year's Day"
      },
      "2027-03-26": {
        "date": "2027-03-26",
        "name": "Good Friday",
        "localName": "Good Friday"
      },
      "2027-05-24": {
        "date": "2027-05-24",
        "name": "Victoria Day",
        "localName": "Victoria Day"
      },
      "2027-07-01": {
        "date": "2027-07-01",
        "name": "Canada Day",
        "localName": "Canada Day"
      },
      "2027-09-06": {
        "date": "2027-09-06",
        "name": "Labour Day",
        "localName": "Labour Day"
      },
      "2027-09-30": {
        "date": "2027-09-30",
        "name": "National Day for Truth and Reconciliation",
        "localName": "National Day for Truth and Reconciliation"
      },
      "2027-10-11": {
        "date": "2027-10-11",
        "name": "Thanksgiving",
        "localName": "Thanksgiving"
      },
      "2027-11-11": {
        "date": "2027-11-11",
        "name": "Remembrance Day",
        "localName": "Remembrance Day"
      },
      "2027-12-25": {
        "date": "2027-12-25",
        "name": "Christmas Day",
        "localName": "Christmas Day"
      },
      "2027-12-27": {
        "date": "2027-12-27",
        "name": "Christmas Day (Observed)",
        "localName": "Christmas Day (Observed)"
      },
      "2027-12-26": {
        "date": "2027-12-26",
        "name": "Boxing Day",
        "localName": "Boxing Day"
      },
      "2027-12-28": {
        "date": "2027-12-28",
        "name": "Boxing Day (Observed)",
        "localName": "Boxing Day (Observed)"
      }
    }
  },
  "US": {
    "2025": {
      "2025-01-01": {
        "date": "2025-01-01",
        "name": "New Year's Day",
        "localName": "New Year's Day"
      },
      "2025-01-20": {
        "date": "2025-01-20",
        "name": "Martin Luther King Jr. Day",
        "localName": "Martin Luther King Jr. Day"
      },
      "2025-02-17": {
        "date": "2025-02-17",
        "name": "Washington's Birthday",
        "localName": "Washington's Birthday (Presidents' Day)"
      },
      "2025-05-26": {
        "date": "2025-05-26",
        "name": "Memorial Day",
        "localName": "Memorial Day"
      },
      "2025-06-19": {
        "date": "2025-06-19",
        "name": "Juneteenth National Independence Day",
        "localName": "Juneteenth"
      },
      "2025-07-04": {
        "date": "2025-07-04",
        "name": "Independence Day",
        "localName": "Independence Day"
      },
      "2025-09-01": {
        "date": "2025-09-01",
        "name": "Labor Day",
        "localName": "Labor Day"
      },
      "2025-10-13": {
        "date": "2025-10-13",
        "name": "Columbus Day",
        "localName": "Columbus Day"
      },
      "2025-11-11": {
        "date": "2025-11-11",
        "name": "Veterans Day",
        "localName": "Veterans Day"
      },
      "2025-11-27": {
        "date": "2025-11-27",
        "name": "Thanksgiving Day",
        "localName": "Thanksgiving Day"
      },
      "2025-12-25": {
        "date": "2025-12-25",
        "name": "Christmas Day",
        "localName": "Christmas Day"
      }
    },
    "2026": {
      "2026-01-01": {
        "date": "2026-01-01",
        "name": "New Year's Day",
        "localName": "New Year's Day"
      },
      "2026-01-19": {
        "date": "2026-01-19",
        "name": "Martin Luther King Jr. Day",
        "localName": "Martin Luther King Jr. Day"
      },
      "2026-02-16": {
        "date": "2026-02-16",
        "name": "Washington's Birthday",
        "localName": "Washington's Birthday (Presidents' Day)"
      },
      "2026-05-25": {
        "date": "2026-05-25",
        "name": "Memorial Day",
        "localName": "Memorial Day"
      },
      "2026-06-19": {
        "date": "2026-06-19",
        "name": "Juneteenth National Independence Day",
        "localName": "Juneteenth"
      },
      "2026-07-04": {
        "date": "2026-07-04",
        "name": "Independence Day",
        "localName": "Independence Day"
      },
      "2026-07-03": {
        "date": "2026-07-03",
        "name": "Independence Day (Observed)",
        "localName": "Independence Day (Observed)"
      },
      "2026-09-07": {
        "date": "2026-09-07",
        "name": "Labor Day",
        "localName": "Labor Day"
      },
      "2026-10-12": {
        "date": "2026-10-12",
        "name": "Columbus Day",
        "localName": "Columbus Day"
      },
      "2026-11-11": {
        "date": "2026-11-11",
        "name": "Veterans Day",
        "localName": "Veterans Day"
      },
      "2026-11-26": {
        "date": "2026-11-26",
        "name": "Thanksgiving Day",
        "localName": "Thanksgiving Day"
      },
      "2026-12-25": {
        "date": "2026-12-25",
        "name": "Christmas Day",
        "localName": "Christmas Day"
      }
    },
    "2027": {
      "2027-01-01": {
        "date": "2027-01-01",
        "name": "New Year's Day",
        "localName": "New Year's Day"
      },
      "2027-01-18": {
        "date": "2027-01-18",
        "name": "Martin Luther King Jr. Day",
        "localName": "Martin Luther King Jr. Day"
      },
      "2027-02-15": {
        "date": "2027-02-15",
        "name": "Washington's Birthday",
        "localName": "Washington's Birthday (Presidents' Day)"
      },
      "2027-05-31": {
        "date": "2027-05-31",
        "name": "Memorial Day",
        "localName": "Memorial Day"
      },
      "2027-06-19": {
        "date": "2027-06-19",
        "name": "Juneteenth National Independence Day",
        "localName": "Juneteenth"
      },
      "2027-06-18": {
        "date": "2027-06-18",
        "name": "Juneteenth National Independence Day (Observed)",
        "localName": "Juneteenth National Independence Day (Observed)"
      },
      "2027-07-04": {
        "date": "2027-07-04",
        "name": "Independence Day",
        "localName": "Independence Day"
      },
      "2027-07-05": {
        "date": "2027-07-05",
        "name": "Independence Day (Observed)",
        "localName": "Independence Day (Observed)"
      },
      "2027-09-06": {
        "date": "2027-09-06",
        "name": "Labor Day",
        "localName": "Labor Day"
      },
      "2027-10-11": {
        "date": "2027-10-11",
        "name": "Columbus Day",
        "localName": "Columbus Day"
      },
      "2027-11-11": {
        "date": "2027-11-11",
        "name": "Veterans Day",
        "localName": "Veterans Day"
      },
      "2027-11-25": {
        "date": "2027-11-25",
        "name": "Thanksgiving Day",
        "localName": "Thanksgiving Day"
      },
      "2027-12-25": {
        "date": "2027-12-25",
        "name": "Christmas Day",
        "localName": "Christmas Day"
      },
      "2027-12-24": {
        "date": "2027-12-24",
        "name": "Christmas Day (Observed)",
        "localName": "Christmas Day (Observed)"
      }
    }
  },
  "TH": {
    "2025": {
      "2025-01-01": {
        "date": "2025-01-01",
        "name": "New Year's Day",
        "localName": "วันขึ้นปีใหม่"
      },
      "2025-04-06": {
        "date": "2025-04-06",
        "name": "Chakri Memorial Day",
        "localName": "วันจักรี"
      },
      "2025-04-07": {
        "date": "2025-04-07",
        "name": "Chakri Memorial Day (Observed)",
        "localName": "วันจักรี (ชดเชย)"
      },
      "2025-04-13": {
        "date": "2025-04-13",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2025-04-16": {
        "date": "2025-04-16",
        "name": "Songkran Festival (Observed)",
        "localName": "วันสงกรานต์ (ชดเชย)"
      },
      "2025-04-14": {
        "date": "2025-04-14",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2025-04-15": {
        "date": "2025-04-15",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2025-05-01": {
        "date": "2025-05-01",
        "name": "National Labour Day",
        "localName": "วันแรงงานแห่งชาติ"
      },
      "2025-05-04": {
        "date": "2025-05-04",
        "name": "Coronation Day",
        "localName": "วันฉัตรมงคล"
      },
      "2025-05-05": {
        "date": "2025-05-05",
        "name": "Coronation Day (Observed)",
        "localName": "วันฉัตรมงคล (ชดเชย)"
      },
      "2025-06-03": {
        "date": "2025-06-03",
        "name": "Queen Suthida's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี"
      },
      "2025-07-28": {
        "date": "2025-07-28",
        "name": "King Vajiralongkorn's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว"
      },
      "2025-08-12": {
        "date": "2025-08-12",
        "name": "Queen Mother Sirikit's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง"
      },
      "2025-10-13": {
        "date": "2025-10-13",
        "name": "King Bhumibol Memorial Day",
        "localName": "วันนวมินทรมหาราช"
      },
      "2025-10-23": {
        "date": "2025-10-23",
        "name": "Chulalongkorn Day",
        "localName": "วันปิยมหาราช"
      },
      "2025-12-05": {
        "date": "2025-12-05",
        "name": "King Bhumibol's Birthday and National Day",
        "localName": "วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 และวันชาติ"
      },
      "2025-12-10": {
        "date": "2025-12-10",
        "name": "Constitution Day",
        "localName": "วันรัฐธรรมนูญ"
      },
      "2025-12-31": {
        "date": "2025-12-31",
        "name": "New Year's Eve",
        "localName": "วันสิ้นปี"
      },
      "2025-02-12": {
        "date": "2025-02-12",
        "name": "Makha Bucha Day",
        "localName": "วันมาฆบูชา"
      },
      "2025-05-11": {
        "date": "2025-05-11",
        "name": "Visakha Bucha Day",
        "localName": "วันวิสาขบูชา"
      },
      "2025-05-12": {
        "date": "2025-05-12",
        "name": "Visakha Bucha Day (Observed)",
        "localName": "วันวิสาขบูชา (ชดเชย)"
      },
      "2025-07-10": {
        "date": "2025-07-10",
        "name": "Asahna Bucha Day",
        "localName": "วันอาสาฬหบูชา"
      },
      "2025-07-11": {
        "date": "2025-07-11",
        "name": "Buddhist Lent Day",
        "localName": "วันเข้าพรรษา"
      }
    },
    "2026": {
      "2026-01-01": {
        "date": "2026-01-01",
        "name": "New Year's Day",
        "localName": "วันขึ้นปีใหม่"
      },
      "2026-04-06": {
        "date": "2026-04-06",
        "name": "Chakri Memorial Day",
        "localName": "วันจักรี"
      },
      "2026-04-13": {
        "date": "2026-04-13",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2026-04-14": {
        "date": "2026-04-14",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2026-04-15": {
        "date": "2026-04-15",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2026-05-01": {
        "date": "2026-05-01",
        "name": "National Labour Day",
        "localName": "วันแรงงานแห่งชาติ"
      },
      "2026-05-04": {
        "date": "2026-05-04",
        "name": "Coronation Day",
        "localName": "วันฉัตรมงคล"
      },
      "2026-06-03": {
        "date": "2026-06-03",
        "name": "Queen Suthida's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี"
      },
      "2026-07-28": {
        "date": "2026-07-28",
        "name": "King Vajiralongkorn's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว"
      },
      "2026-08-12": {
        "date": "2026-08-12",
        "name": "Queen Mother Sirikit's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง"
      },
      "2026-10-13": {
        "date": "2026-10-13",
        "name": "King Bhumibol Memorial Day",
        "localName": "วันนวมินทรมหาราช"
      },
      "2026-10-23": {
        "date": "2026-10-23",
        "name": "Chulalongkorn Day",
        "localName": "วันปิยมหาราช"
      },
      "2026-12-05": {
        "date": "2026-12-05",
        "name": "King Bhumibol's Birthday and National Day",
        "localName": "วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 และวันชาติ"
      },
      "2026-12-07": {
        "date": "2026-12-07",
        "name": "King Bhumibol's Birthday and National Day (Observed)",
        "localName": "วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 และวันชาติ (ชดเชย)"
      },
      "2026-12-10": {
        "date": "2026-12-10",
        "name": "Constitution Day",
        "localName": "วันรัฐธรรมนูญ"
      },
      "2026-12-31": {
        "date": "2026-12-31",
        "name": "New Year's Eve",
        "localName": "วันสิ้นปี"
      },
      "2026-03-03": {
        "date": "2026-03-03",
        "name": "Makha Bucha Day",
        "localName": "วันมาฆบูชา"
      },
      "2026-05-31": {
        "date": "2026-05-31",
        "name": "Visakha Bucha Day",
        "localName": "วันวิสาขบูชา"
      },
      "2026-06-01": {
        "date": "2026-06-01",
        "name": "Visakha Bucha Day (Observed)",
        "localName": "วันวิสาขบูชา (ชดเชย)"
      },
      "2026-07-29": {
        "date": "2026-07-29",
        "name": "Asahna Bucha Day",
        "localName": "วันอาสาฬหบูชา"
      },
      "2026-07-30": {
        "date": "2026-07-30",
        "name": "Buddhist Lent Day",
        "localName": "วันเข้าพรรษา"
      }
    },
    "2027": {
      "2027-01-01": {
        "date": "2027-01-01",
        "name": "New Year's Day",
        "localName": "วันขึ้นปีใหม่"
      },
      "2027-04-06": {
        "date": "2027-04-06",
        "name": "Chakri Memorial Day",
        "localName": "วันจักรี"
      },
      "2027-04-13": {
        "date": "2027-04-13",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2027-04-14": {
        "date": "2027-04-14",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2027-04-15": {
        "date": "2027-04-15",
        "name": "Songkran Festival",
        "localName": "วันสงกรานต์"
      },
      "2027-05-01": {
        "date": "2027-05-01",
        "name": "National Labour Day",
        "localName": "วันแรงงานแห่งชาติ"
      },
      "2027-05-03": {
        "date": "2027-05-03",
        "name": "National Labour Day (Observed)",
        "localName": "วันแรงงานแห่งชาติ (ชดเชย)"
      },
      "2027-05-04": {
        "date": "2027-05-04",
        "name": "Coronation Day",
        "localName": "วันฉัตรมงคล"
      },
      "2027-06-03": {
        "date": "2027-06-03",
        "name": "Queen Suthida's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี"
      },
      "2027-07-28": {
        "date": "2027-07-28",
        "name": "King Vajiralongkorn's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว"
      },
      "2027-08-12": {
        "date": "2027-08-12",
        "name": "Queen Mother Sirikit's Birthday",
        "localName": "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง"
      },
      "2027-10-13": {
        "date": "2027-10-13",
        "name": "King Bhumibol Memorial Day",
        "localName": "วันนวมินทรมหาราช"
      },
      "2027-10-23": {
        "date": "2027-10-23",
        "name": "Chulalongkorn Day",
        "localName": "วันปิยมหาราช"
      },
      "2027-10-25": {
        "date": "2027-10-25",
        "name": "Chulalongkorn Day (Observed)",
        "localName": "วันปิยมหาราช (ชดเชย)"
      },
      "2027-12-05": {
        "date": "2027-12-05",
        "name": "King Bhumibol's Birthday and National Day",
        "localName": "วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 และวันชาติ"
      },
      "2027-12-06": {
        "date": "2027-12-06",
        "name": "King Bhumibol's Birthday and National Day (Observed)",
        "localName": "วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 และวันชาติ (ชดเชย)"
      },
      "2027-12-10": {
        "date": "2027-12-10",
        "name": "Constitution Day",
        "localName": "วันรัฐธรรมนูญ"
      },
      "2027-12-31": {
        "date": "2027-12-31",
        "name": "New Year's Eve",
        "localName": "วันสิ้นปี"
      },
      "2027-02-21": {
        "date": "2027-02-21",
        "name": "Makha Bucha Day",
        "localName": "วันมาฆบูชา"
      },
      "2027-02-22": {
        "date": "2027-02-22",
        "name": "Makha Bucha Day (Observed)",
        "localName": "วันมาฆบูชา (ชดเชย)"
      },
      "2027-05-20": {
        "date": "2027-05-20",
        "name": "Visakha Bucha Day",
        "localName": "วันวิสาขบูชา"
      },
      "2027-07-18": {
        "date": "2027-07-18",
        "name": "Asahna Bucha Day",
        "localName": "วันอาสาฬหบูชา"
      },
      "2027-07-19": {
        "date": "2027-07-19",
        "name": "Asahna Bucha Day (Observed)",
        "localName": "วันอาสาฬหบูชา (ชดเชย)"
      },
      "2027-07-20": {
        "date": "2027-07-20",
        "name": "Buddhist Lent Day",
        "localName": "วันเข้าพรรษา"
      }
    }
  }
};

/**
 * Fetches and returns a map of dateKey -> holiday object for the given country and year.
 * Checks storage cache first, then static bundled data, then queries RandomAPI.
 */
export async function getHolidaysForYear(countryCode, year) {
  if (!countryCode) return {};

  const cacheKey = `holidays_${countryCode}_${year}`;
  const stored = await Storage.get(cacheKey);
  if (stored && stored[cacheKey] && typeof stored[cacheKey] === 'object') {
    return stored[cacheKey];
  }

  // Check bundled static data
  if (STATIC_HOLIDAYS[countryCode] && STATIC_HOLIDAYS[countryCode][String(year)]) {
    const bundled = STATIC_HOLIDAYS[countryCode][String(year)];
    await Storage.set({ [cacheKey]: bundled });
    return bundled;
  }

  // Fetch from free RandomAPI
  try {
    const url = `https://randomapi.dev/api/holidays?country=${encodeURIComponent(countryCode)}&year=${encodeURIComponent(year)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        const holidayMap = {};
        for (const item of json.data) {
          if (!item.date) continue;
          holidayMap[item.date] = {
            date: item.date,
            name: item.name || 'Public Holiday',
            localName: item.localName || item.name || 'Public Holiday'
          };
          if (item.observed && !holidayMap[item.observed]) {
            holidayMap[item.observed] = {
              date: item.observed,
              name: `${item.name} (Observed)`,
              localName: item.localName ? `${item.localName} (Observed)` : `${item.name} (Observed)`
            };
          }
        }
        await Storage.set({ [cacheKey]: holidayMap });
        return holidayMap;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch holidays from RandomAPI:', err);
  }

  // Fallback to Nager.Date API
  try {
    const nagerUrl = `https://date.nager.at/api/v3/PublicHolidays/${encodeURIComponent(year)}/${encodeURIComponent(countryCode)}`;
    const res = await fetch(nagerUrl);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) {
        const holidayMap = {};
        for (const item of json) {
          if (!item.date) continue;
          holidayMap[item.date] = {
            date: item.date,
            name: item.name || 'Public Holiday',
            localName: item.localName || item.name || 'Public Holiday'
          };
        }
        await Storage.set({ [cacheKey]: holidayMap });
        return holidayMap;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch holidays from Nager.Date:', err);
  }

  return {};
}
