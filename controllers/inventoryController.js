import pool from '../db/pool.js';

export const getInventory = async (req,res)=>{
  try{
    const result = await pool.query(`
      SELECT i.*, p.name AS product_name, v.variant_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id=p.id
      LEFT JOIN product_variants v ON i.variant_id=v.id
      ORDER BY i.id DESC
    `);
    res.json(result.rows);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const updateInventory = async (req,res)=>{
  const {id}=req.params;
  const {quantity, reorder_quantity} = req.body;
  try{
    const result = await pool.query(
      `UPDATE inventory SET quantity=$1, reorder_quantity=$2, updated_at=now() WHERE id=$3 RETURNING *`,
      [quantity, reorder_quantity, id]
    );
    res.json(result.rows[0]);
  } catch(err){ res.status(500).json({error: err.message}); }
};
