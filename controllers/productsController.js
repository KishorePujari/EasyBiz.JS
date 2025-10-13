import pool from '../db/pool.js';

export const getAllProducts = async (req,res)=>{
  try{
    const result = await pool.query(`
      SELECT p.*, c.name AS category_name, b.name AS brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id=c.id
      LEFT JOIN brands b ON p.brand_id=b.id
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const getProductById = async (req,res)=>{
  const {id}=req.params;
  try{
    const result = await pool.query('SELECT * FROM products WHERE id=$1',[id]);
    if(!result.rows.length) return res.status(404).json({error:'Product not found'});
    res.json(result.rows[0]);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const addProduct = async (req,res)=>{
  const {name, description, category_id, brand_id, unit_of_measure, tax_percent}=req.body;
  try{
    const result=await pool.query(
      `INSERT INTO products (name, description, category_id, brand_id, unit_of_measure, tax_percent)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
       [name, description, category_id, brand_id, unit_of_measure, tax_percent]
    );
    res.json(result.rows[0]);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const updateProduct = async (req,res)=>{
  const {id}=req.params;
  const {name, description, category_id, brand_id, unit_of_measure, tax_percent}=req.body;
  try{
    const result=await pool.query(
      `UPDATE products SET name=$1, description=$2, category_id=$3, brand_id=$4, unit_of_measure=$5, tax_percent=$6, created_at=now()
       WHERE id=$7 RETURNING *`,
       [name, description, category_id, brand_id, unit_of_measure, tax_percent, id]
    );
    if(!result.rows.length) return res.status(404).json({error:'Product not found'});
    res.json(result.rows[0]);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const deleteProduct = async (req,res)=>{
  const {id}=req.params;
  try{
    await pool.query('DELETE FROM products WHERE id=$1',[id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error: err.message}); }
};
