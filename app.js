
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'tour_gwangju',
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : undefined
});
app.get('/api/restaurants', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM places_unique
      ORDER BY place_id ASC
    `);

    res.json({
      success: true,
      rows
    });
  } catch (err) {
    console.error(err);
    res.json({
      success: false,
      error: err.message
    });
  }
});
app.get('/api/stations', async (req, res) => {
  try {
    const { line_id } = req.query;
    const lineMap = { '1': '1호선', '2': '2호선' };
    const lineName = lineMap[line_id];
    let sql, params = [];
    if (lineName) {
      sql = 'SELECT station_name, line_name, district FROM places_unique WHERE line_name = ? GROUP BY station_name, line_name, district';
      params = [lineName];
    } else {
      sql = 'SELECT station_name, line_name, district FROM places_unique GROUP BY station_name, line_name, district';
    }
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, stations: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/places', async (req, res) => {
  try {
    const { line_name, station_name } = req.query;

    if (!line_name || !station_name) {
      return res.status(400).json({
        error: 'line_name과 station_name이 필요합니다.'
      });
    }

    const [rows] = await pool.query(
  `
  SELECT
    place_id,
    line_name,
    station_name,
    place_name,
    category,
    place_type,
    address,
    phone,
    date_score,
    source_grade,
    latitude,
    longitude,
    image_url,
    naver_place_search_url
  FROM places_unique
  WHERE line_name = ?
    AND station_name = ?
  ORDER BY place_id ASC
  `,
  [line_name, station_name]
);

res.json(rows);
  } catch (err) {
    console.error('맛집 조회 오류:', err);
    res.status(500).json({
      error: '맛집 데이터를 가져올 수 없습니다.'
    });
  }
});

app.listen(3000, () => console.log('✅ 서버 실행: http://localhost:3000'));