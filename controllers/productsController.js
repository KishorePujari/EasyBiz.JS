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


export const searchProduct = async (req, res) => {
    try {
        const pool = await getPool(); 
        
        const { query, category, brand } = req.query; 

        // 1. Get Store ID from Verified JWT Payload (Crucial Security Step)
        // Assume req.user is populated by JWT middleware after successful verification.
        const storeId = req.user.store_id; 
        
        let whereClauses = [];
        let queryParams = [storeId]; // Store ID is the first parameter
        let paramIndex = 2; // Start subsequent parameters at index 2

        // Base search condition (on Product Name/SKU)
        if (query && query.length > 0) {
            const searchTerm = `%${query.toLowerCase()}%`;
            whereClauses.push(`(LOWER(p.name) LIKE $${paramIndex} OR LOWER(p.sku) LIKE $${paramIndex})`);
            queryParams.push(searchTerm);
            paramIndex++;
        }
        
        // Add optional filters
        if (category) { whereClauses.push(`p.category = $${paramIndex}`); queryParams.push(category); paramIndex++; }
        if (brand) { whereClauses.push(`p.brand = $${paramIndex}`); queryParams.push(brand); paramIndex++; }
        
        // 2. Construct the Join Query
        // Joins: Products -> Product_Variants -> Inventory (filtered by Store ID)
        const whereCondition = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';
        
        const sqlQuery = `
            SELECT 
                pv.sku,                     -- Final SKU (Variant SKU)
                p.name AS product_name,     -- Base Product Name
                pv.variant_name,            -- e.g., 'Red', 'Small', '250g'
                pv.base_rate AS rate,       -- The selling rate
                p.gst_rate AS gst,
                p.hsn_code AS hsn,
                inv.quantity                -- Live Stock
            FROM 
                products p
            JOIN 
                product_variants pv ON p.product_id = pv.product_id
            JOIN 
                inventory inv ON pv.variant_id = inv.variant_id
            WHERE 
                inv.store_id = $1             -- Filter by User's Store ID
                ${whereCondition}             -- Apply text search and filters
            ORDER BY 
                p.name
            LIMIT 25;
        `;
        
        // 3. Execute Query
        const result = await pool.query(sqlQuery, queryParams);

        // 4. Format and Send Response
        // The frontend needs a consolidated name (e.g., "Milk (1L) - 250g")
        const products = result.rows.map(row => ({
            sku: row.sku,
            // Combine base name and variant for display
            name: `${row.product_name}${row.variant_name ? ' - ' + row.variant_name : ''}`,
            rate: parseFloat(row.rate),
            gst: parseFloat(row.gst),
            hsn: row.hsn,
            stock: parseInt(row.quantity),
            // The frontend needs to know if multiple variants exist (not strictly needed here, but useful)
        }));

        res.json({ products });

    } catch (err) {
        console.error("Product Search Error:", err.message);
        res.status(500).json({ message: "Server error during product search" });
    }
};