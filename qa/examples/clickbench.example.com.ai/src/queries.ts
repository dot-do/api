/**
 * ClickBench Queries
 *
 * All 43 queries from the official ClickBench benchmark.
 * Source: https://github.com/ClickHouse/ClickBench
 */

export interface ClickBenchQuery {
  id: number
  name: string
  description: string
  category: 'count' | 'aggregation' | 'groupby' | 'filter' | 'sort' | 'string' | 'complex'
  query: string
}

/**
 * All 43 ClickBench queries
 */
export const CLICKBENCH_QUERIES: ClickBenchQuery[] = [
  // Q0: Simple count
  {
    id: 0,
    name: 'count_all',
    description: 'Count all rows in the table',
    category: 'count',
    query: `SELECT COUNT(*) FROM hits;`,
  },

  // Q1: Count with filter
  {
    id: 1,
    name: 'count_advengine',
    description: 'Count rows where AdvEngineID is not zero',
    category: 'count',
    query: `SELECT COUNT(*) FROM hits WHERE AdvEngineID <> 0;`,
  },

  // Q2: Multiple aggregations
  {
    id: 2,
    name: 'multi_agg',
    description: 'SUM, COUNT, AVG on different columns',
    category: 'aggregation',
    query: `SELECT SUM(AdvEngineID), COUNT(*), AVG(ResolutionWidth) FROM hits;`,
  },

  // Q3: AVG on large integer
  {
    id: 3,
    name: 'avg_userid',
    description: 'Average of UserID (large integers)',
    category: 'aggregation',
    query: `SELECT AVG(UserID) FROM hits;`,
  },

  // Q4: Count distinct users
  {
    id: 4,
    name: 'count_distinct_users',
    description: 'Count distinct UserID values',
    category: 'aggregation',
    query: `SELECT COUNT(DISTINCT UserID) FROM hits;`,
  },

  // Q5: Count distinct search phrases
  {
    id: 5,
    name: 'count_distinct_searchphrase',
    description: 'Count distinct SearchPhrase values',
    category: 'aggregation',
    query: `SELECT COUNT(DISTINCT SearchPhrase) FROM hits;`,
  },

  // Q6: Min/Max dates
  {
    id: 6,
    name: 'min_max_dates',
    description: 'Find minimum and maximum EventDate',
    category: 'aggregation',
    query: `SELECT MIN(EventDate), MAX(EventDate) FROM hits;`,
  },

  // Q7: Group by with filter and order
  {
    id: 7,
    name: 'groupby_advengine',
    description: 'Group by AdvEngineID, filter non-zero, order by count',
    category: 'groupby',
    query: `SELECT AdvEngineID, COUNT(*) FROM hits WHERE AdvEngineID <> 0 GROUP BY AdvEngineID ORDER BY COUNT(*) DESC;`,
  },

  // Q8: Group by with distinct count
  {
    id: 8,
    name: 'groupby_region_distinct',
    description: 'Distinct users per region, top 10',
    category: 'groupby',
    query: `SELECT RegionID, COUNT(DISTINCT UserID) AS u FROM hits GROUP BY RegionID ORDER BY u DESC LIMIT 10;`,
  },

  // Q9: Multiple aggregates per group
  {
    id: 9,
    name: 'groupby_region_multi_agg',
    description: 'Multiple aggregates per region, top 10',
    category: 'groupby',
    query: `SELECT RegionID, SUM(AdvEngineID), COUNT(*) AS c, AVG(ResolutionWidth), COUNT(DISTINCT UserID) FROM hits GROUP BY RegionID ORDER BY c DESC LIMIT 10;`,
  },

  // Q10: String filter with distinct
  {
    id: 10,
    name: 'groupby_mobilephone_model',
    description: 'Distinct users per MobilePhoneModel, filter non-empty',
    category: 'groupby',
    query: `SELECT MobilePhoneModel, COUNT(DISTINCT UserID) AS u FROM hits WHERE MobilePhoneModel <> '' GROUP BY MobilePhoneModel ORDER BY u DESC LIMIT 10;`,
  },

  // Q11: Two-column group by
  {
    id: 11,
    name: 'groupby_mobilephone_two_cols',
    description: 'Group by MobilePhone and MobilePhoneModel',
    category: 'groupby',
    query: `SELECT MobilePhone, MobilePhoneModel, COUNT(DISTINCT UserID) AS u FROM hits WHERE MobilePhoneModel <> '' GROUP BY MobilePhone, MobilePhoneModel ORDER BY u DESC LIMIT 10;`,
  },

  // Q12: Search phrase count
  {
    id: 12,
    name: 'groupby_searchphrase_count',
    description: 'Top search phrases by count',
    category: 'groupby',
    query: `SELECT SearchPhrase, COUNT(*) AS c FROM hits WHERE SearchPhrase <> '' GROUP BY SearchPhrase ORDER BY c DESC LIMIT 10;`,
  },

  // Q13: Search phrase distinct users
  {
    id: 13,
    name: 'groupby_searchphrase_users',
    description: 'Top search phrases by distinct users',
    category: 'groupby',
    query: `SELECT SearchPhrase, COUNT(DISTINCT UserID) AS u FROM hits WHERE SearchPhrase <> '' GROUP BY SearchPhrase ORDER BY u DESC LIMIT 10;`,
  },

  // Q14: Two-column search phrase group
  {
    id: 14,
    name: 'groupby_searchengine_phrase',
    description: 'Group by SearchEngineID and SearchPhrase',
    category: 'groupby',
    query: `SELECT SearchEngineID, SearchPhrase, COUNT(*) AS c FROM hits WHERE SearchPhrase <> '' GROUP BY SearchEngineID, SearchPhrase ORDER BY c DESC LIMIT 10;`,
  },

  // Q15: User count
  {
    id: 15,
    name: 'groupby_userid',
    description: 'Top users by hit count',
    category: 'groupby',
    query: `SELECT UserID, COUNT(*) FROM hits GROUP BY UserID ORDER BY COUNT(*) DESC LIMIT 10;`,
  },

  // Q16: User and search phrase
  {
    id: 16,
    name: 'groupby_user_searchphrase_ordered',
    description: 'User and SearchPhrase combinations ordered',
    category: 'groupby',
    query: `SELECT UserID, SearchPhrase, COUNT(*) FROM hits GROUP BY UserID, SearchPhrase ORDER BY COUNT(*) DESC LIMIT 10;`,
  },

  // Q17: User and search phrase unordered
  {
    id: 17,
    name: 'groupby_user_searchphrase',
    description: 'User and SearchPhrase combinations',
    category: 'groupby',
    query: `SELECT UserID, SearchPhrase, COUNT(*) FROM hits GROUP BY UserID, SearchPhrase LIMIT 10;`,
  },

  // Q18: User, minute, search phrase
  {
    id: 18,
    name: 'groupby_user_minute_phrase',
    description: 'Group by user, minute of event, and search phrase',
    category: 'groupby',
    query: `SELECT UserID, EXTRACT(MINUTE FROM EventTime) AS m, SearchPhrase, COUNT(*) FROM hits GROUP BY UserID, m, SearchPhrase ORDER BY COUNT(*) DESC LIMIT 10;`,
  },

  // Q19: Point lookup
  {
    id: 19,
    name: 'filter_specific_user',
    description: 'Filter by specific UserID',
    category: 'filter',
    query: `SELECT UserID FROM hits WHERE UserID = 435090932899640449;`,
  },

  // Q20: LIKE pattern on URL
  {
    id: 20,
    name: 'filter_url_like',
    description: 'Count URLs containing google',
    category: 'string',
    query: `SELECT COUNT(*) FROM hits WHERE URL LIKE '%google%';`,
  },

  // Q21: LIKE with group by
  {
    id: 21,
    name: 'groupby_searchphrase_url_google',
    description: 'Search phrases for URLs containing google',
    category: 'string',
    query: `SELECT SearchPhrase, MIN(URL), COUNT(*) AS c FROM hits WHERE URL LIKE '%google%' AND SearchPhrase <> '' GROUP BY SearchPhrase ORDER BY c DESC LIMIT 10;`,
  },

  // Q22: Complex LIKE conditions
  {
    id: 22,
    name: 'groupby_title_google_complex',
    description: 'Complex LIKE conditions on Title and URL',
    category: 'string',
    query: `SELECT SearchPhrase, MIN(URL), MIN(Title), COUNT(*) AS c, COUNT(DISTINCT UserID) FROM hits WHERE Title LIKE '%Google%' AND URL NOT LIKE '%.google.%' AND SearchPhrase <> '' GROUP BY SearchPhrase ORDER BY c DESC LIMIT 10;`,
  },

  // Q23: Full row with LIKE and sort
  {
    id: 23,
    name: 'select_all_url_google',
    description: 'Select all columns where URL contains google, ordered by EventTime',
    category: 'string',
    query: `SELECT * FROM hits WHERE URL LIKE '%google%' ORDER BY EventTime LIMIT 10;`,
  },

  // Q24: Sort by EventTime
  {
    id: 24,
    name: 'sort_searchphrase_eventtime',
    description: 'SearchPhrase sorted by EventTime',
    category: 'sort',
    query: `SELECT SearchPhrase FROM hits WHERE SearchPhrase <> '' ORDER BY EventTime LIMIT 10;`,
  },

  // Q25: Sort by SearchPhrase
  {
    id: 25,
    name: 'sort_searchphrase_alpha',
    description: 'SearchPhrase sorted alphabetically',
    category: 'sort',
    query: `SELECT SearchPhrase FROM hits WHERE SearchPhrase <> '' ORDER BY SearchPhrase LIMIT 10;`,
  },

  // Q26: Two-column sort
  {
    id: 26,
    name: 'sort_searchphrase_two_cols',
    description: 'SearchPhrase sorted by EventTime and SearchPhrase',
    category: 'sort',
    query: `SELECT SearchPhrase FROM hits WHERE SearchPhrase <> '' ORDER BY EventTime, SearchPhrase LIMIT 10;`,
  },

  // Q27: HAVING clause with length function
  {
    id: 27,
    name: 'groupby_counter_url_length',
    description: 'Average URL length by counter, high volume only',
    category: 'complex',
    query: `SELECT CounterID, AVG(LENGTH(URL)) AS l, COUNT(*) AS c FROM hits WHERE URL <> '' GROUP BY CounterID HAVING COUNT(*) > 100000 ORDER BY l DESC LIMIT 25;`,
  },

  // Q28: Regex replace with aggregation
  {
    id: 28,
    name: 'groupby_referer_domain',
    description: 'Extract domain from Referer using regex',
    category: 'complex',
    query: `SELECT REGEXP_REPLACE(Referer, '^https?://(?:www\\.)?([^/]+)/.*$', '\\1') AS k, AVG(LENGTH(Referer)) AS l, COUNT(*) AS c, MIN(Referer) FROM hits WHERE Referer <> '' GROUP BY k HAVING COUNT(*) > 100000 ORDER BY l DESC LIMIT 25;`,
  },

  // Q29: Many column aggregation
  {
    id: 29,
    name: 'multi_sum_resolution',
    description: 'Multiple SUM aggregations on ResolutionWidth',
    category: 'aggregation',
    query: `SELECT
      SUM(ResolutionWidth), SUM(ResolutionWidth + 1), SUM(ResolutionWidth + 2), SUM(ResolutionWidth + 3), SUM(ResolutionWidth + 4),
      SUM(ResolutionWidth + 5), SUM(ResolutionWidth + 6), SUM(ResolutionWidth + 7), SUM(ResolutionWidth + 8), SUM(ResolutionWidth + 9),
      SUM(ResolutionWidth + 10), SUM(ResolutionWidth + 11), SUM(ResolutionWidth + 12), SUM(ResolutionWidth + 13), SUM(ResolutionWidth + 14),
      SUM(ResolutionWidth + 15), SUM(ResolutionWidth + 16), SUM(ResolutionWidth + 17), SUM(ResolutionWidth + 18), SUM(ResolutionWidth + 19),
      SUM(ResolutionWidth + 20), SUM(ResolutionWidth + 21), SUM(ResolutionWidth + 22), SUM(ResolutionWidth + 23), SUM(ResolutionWidth + 24),
      SUM(ResolutionWidth + 25), SUM(ResolutionWidth + 26), SUM(ResolutionWidth + 27), SUM(ResolutionWidth + 28), SUM(ResolutionWidth + 29),
      SUM(ResolutionWidth + 30), SUM(ResolutionWidth + 31), SUM(ResolutionWidth + 32), SUM(ResolutionWidth + 33), SUM(ResolutionWidth + 34),
      SUM(ResolutionWidth + 35), SUM(ResolutionWidth + 36), SUM(ResolutionWidth + 37), SUM(ResolutionWidth + 38), SUM(ResolutionWidth + 39),
      SUM(ResolutionWidth + 40), SUM(ResolutionWidth + 41), SUM(ResolutionWidth + 42), SUM(ResolutionWidth + 43), SUM(ResolutionWidth + 44),
      SUM(ResolutionWidth + 45), SUM(ResolutionWidth + 46), SUM(ResolutionWidth + 47), SUM(ResolutionWidth + 48), SUM(ResolutionWidth + 49),
      SUM(ResolutionWidth + 50), SUM(ResolutionWidth + 51), SUM(ResolutionWidth + 52), SUM(ResolutionWidth + 53), SUM(ResolutionWidth + 54),
      SUM(ResolutionWidth + 55), SUM(ResolutionWidth + 56), SUM(ResolutionWidth + 57), SUM(ResolutionWidth + 58), SUM(ResolutionWidth + 59),
      SUM(ResolutionWidth + 60), SUM(ResolutionWidth + 61), SUM(ResolutionWidth + 62), SUM(ResolutionWidth + 63), SUM(ResolutionWidth + 64),
      SUM(ResolutionWidth + 65), SUM(ResolutionWidth + 66), SUM(ResolutionWidth + 67), SUM(ResolutionWidth + 68), SUM(ResolutionWidth + 69),
      SUM(ResolutionWidth + 70), SUM(ResolutionWidth + 71), SUM(ResolutionWidth + 72), SUM(ResolutionWidth + 73), SUM(ResolutionWidth + 74),
      SUM(ResolutionWidth + 75), SUM(ResolutionWidth + 76), SUM(ResolutionWidth + 77), SUM(ResolutionWidth + 78), SUM(ResolutionWidth + 79),
      SUM(ResolutionWidth + 80), SUM(ResolutionWidth + 81), SUM(ResolutionWidth + 82), SUM(ResolutionWidth + 83), SUM(ResolutionWidth + 84),
      SUM(ResolutionWidth + 85), SUM(ResolutionWidth + 86), SUM(ResolutionWidth + 87), SUM(ResolutionWidth + 88), SUM(ResolutionWidth + 89)
    FROM hits;`,
  },

  // Q30: Search group by with filter
  {
    id: 30,
    name: 'groupby_searchengine_clientip',
    description: 'Group by SearchEngineID and ClientIP',
    category: 'groupby',
    query: `SELECT SearchEngineID, ClientIP, COUNT(*) AS c, SUM(IsRefresh), AVG(ResolutionWidth) FROM hits WHERE SearchPhrase <> '' GROUP BY SearchEngineID, ClientIP ORDER BY c DESC LIMIT 10;`,
  },

  // Q31: WatchID group by
  {
    id: 31,
    name: 'groupby_watchid_clientip_filtered',
    description: 'Group by WatchID and ClientIP with filter',
    category: 'groupby',
    query: `SELECT WatchID, ClientIP, COUNT(*) AS c, SUM(IsRefresh), AVG(ResolutionWidth) FROM hits WHERE SearchPhrase <> '' GROUP BY WatchID, ClientIP ORDER BY c DESC LIMIT 10;`,
  },

  // Q32: WatchID group by without filter
  {
    id: 32,
    name: 'groupby_watchid_clientip',
    description: 'Group by WatchID and ClientIP without filter',
    category: 'groupby',
    query: `SELECT WatchID, ClientIP, COUNT(*) AS c, SUM(IsRefresh), AVG(ResolutionWidth) FROM hits GROUP BY WatchID, ClientIP ORDER BY c DESC LIMIT 10;`,
  },

  // Q33: URL group by
  {
    id: 33,
    name: 'groupby_url',
    description: 'Group by URL',
    category: 'groupby',
    query: `SELECT URL, COUNT(*) AS c FROM hits GROUP BY URL ORDER BY c DESC LIMIT 10;`,
  },

  // Q34: URL group by with constant
  {
    id: 34,
    name: 'groupby_url_with_constant',
    description: 'Group by constant and URL',
    category: 'groupby',
    query: `SELECT 1, URL, COUNT(*) AS c FROM hits GROUP BY 1, URL ORDER BY c DESC LIMIT 10;`,
  },

  // Q35: Computed columns group by
  {
    id: 35,
    name: 'groupby_clientip_computed',
    description: 'Group by ClientIP and computed columns',
    category: 'groupby',
    query: `SELECT ClientIP, ClientIP - 1, ClientIP - 2, ClientIP - 3, COUNT(*) AS c FROM hits GROUP BY ClientIP, ClientIP - 1, ClientIP - 2, ClientIP - 3 ORDER BY c DESC LIMIT 10;`,
  },

  // Q36: Counter with date range filter
  {
    id: 36,
    name: 'groupby_url_counter_daterange',
    description: 'URL by counter with date range and flags',
    category: 'complex',
    query: `SELECT URL, COUNT(*) AS PageViews FROM hits WHERE CounterID = 62 AND EventDate >= '2013-07-01' AND EventDate <= '2013-07-31' AND DontCountHits = 0 AND IsRefresh = 0 AND URL <> '' GROUP BY URL ORDER BY PageViews DESC LIMIT 10;`,
  },

  // Q37: Title with date range filter
  {
    id: 37,
    name: 'groupby_title_counter_daterange',
    description: 'Title by counter with date range and flags',
    category: 'complex',
    query: `SELECT Title, COUNT(*) AS PageViews FROM hits WHERE CounterID = 62 AND EventDate >= '2013-07-01' AND EventDate <= '2013-07-31' AND DontCountHits = 0 AND IsRefresh = 0 AND Title <> '' GROUP BY Title ORDER BY PageViews DESC LIMIT 10;`,
  },

  // Q38: URL with offset
  {
    id: 38,
    name: 'groupby_url_counter_offset',
    description: 'URL by counter with offset',
    category: 'complex',
    query: `SELECT URL, COUNT(*) AS PageViews FROM hits WHERE CounterID = 62 AND EventDate >= '2013-07-01' AND EventDate <= '2013-07-31' AND IsRefresh = 0 AND IsLink <> 0 AND IsDownload = 0 GROUP BY URL ORDER BY PageViews DESC LIMIT 10 OFFSET 1000;`,
  },

  // Q39: Complex CASE expression
  {
    id: 39,
    name: 'groupby_traffic_source_case',
    description: 'Traffic source with CASE expression',
    category: 'complex',
    query: `SELECT TraficSourceID, SearchEngineID, AdvEngineID, CASE WHEN (SearchEngineID = 0 AND AdvEngineID = 0) THEN Referer ELSE '' END AS Src, URL AS Dst, COUNT(*) AS PageViews FROM hits WHERE CounterID = 62 AND EventDate >= '2013-07-01' AND EventDate <= '2013-07-31' AND IsRefresh = 0 GROUP BY TraficSourceID, SearchEngineID, AdvEngineID, Src, Dst ORDER BY PageViews DESC LIMIT 10 OFFSET 1000;`,
  },

  // Q40: URL hash with specific referer
  {
    id: 40,
    name: 'groupby_urlhash_referer',
    description: 'URLHash with specific RefererHash',
    category: 'complex',
    query: `SELECT URLHash, EventDate, COUNT(*) AS PageViews FROM hits WHERE CounterID = 62 AND EventDate >= '2013-07-01' AND EventDate <= '2013-07-31' AND IsRefresh = 0 AND TraficSourceID IN (-1, 6) AND RefererHash = 3594120000172545465 GROUP BY URLHash, EventDate ORDER BY PageViews DESC LIMIT 10 OFFSET 100;`,
  },

  // Q41: Window dimensions
  {
    id: 41,
    name: 'groupby_window_dims',
    description: 'Window dimensions with specific URLHash',
    category: 'complex',
    query: `SELECT WindowClientWidth, WindowClientHeight, COUNT(*) AS PageViews FROM hits WHERE CounterID = 62 AND EventDate >= '2013-07-01' AND EventDate <= '2013-07-31' AND IsRefresh = 0 AND DontCountHits = 0 AND URLHash = 2868770270353813622 GROUP BY WindowClientWidth, WindowClientHeight ORDER BY PageViews DESC LIMIT 10 OFFSET 10000;`,
  },

  // Q42: Date truncation to minute
  {
    id: 42,
    name: 'groupby_minute_truncation',
    description: 'Group by minute using DATE_TRUNC',
    category: 'complex',
    query: `SELECT DATE_TRUNC('minute', EventTime) AS M, COUNT(*) AS PageViews FROM hits WHERE CounterID = 62 AND EventDate >= '2013-07-14' AND EventDate <= '2013-07-15' AND IsRefresh = 0 AND DontCountHits = 0 GROUP BY DATE_TRUNC('minute', EventTime) ORDER BY DATE_TRUNC('minute', EventTime) LIMIT 10 OFFSET 1000;`,
  },
]

/**
 * Get queries by category
 */
export function getQueriesByCategory(category: ClickBenchQuery['category']): ClickBenchQuery[] {
  return CLICKBENCH_QUERIES.filter((q) => q.category === category)
}

/**
 * Quick benchmark subset - faster queries for quick testing
 */
export const QUICK_QUERIES: ClickBenchQuery[] = [
  CLICKBENCH_QUERIES[0], // count_all
  CLICKBENCH_QUERIES[2], // multi_agg
  CLICKBENCH_QUERIES[6], // min_max_dates
  CLICKBENCH_QUERIES[7], // groupby_advengine
  CLICKBENCH_QUERIES[19], // filter_specific_user
]
