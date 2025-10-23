import { getPool } from '../db/pool.js';

export const getAllProducts = async (req,res)=>{

  const pool = await getPool(); 
  
  // Destructure pagination and filter parameters from req.query
  const { 
    page = 1, 
    per_page = 20, 
    category_id, 
    brand_id, 
    status,
    search 
  } = req.query;

  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;

  let whereClauses = [];
  let queryParams = [];
  let paramIndex = 1;
  
  // Build dynamic WHERE clauses
  if (category_id) { 
    whereClauses.push(`p.category_id = $${paramIndex++}`); 
    queryParams.push(category_id); 
  }
  if (brand_id) { 
    whereClauses.push(`p.brand_id = $${paramIndex++}`); 
    queryParams.push(brand_id); 
  }
  if (status) {
    // Assuming 'active' maps to is_active=TRUE and 'inactive' maps to is_active=FALSE
    const isActive = status.toLowerCase() === 'active';
    whereClauses.push(`p.is_active = $${paramIndex++}`);
    queryParams.push(isActive);
  }
  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    whereClauses.push(`(LOWER(p.name) LIKE $${paramIndex++} OR LOWER(p.short_name) LIKE $${paramIndex++})`);
    queryParams.push(searchTerm, searchTerm); // Use searchTerm twice for name and short_name
  }

  const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try{
    // 1. Get Total Count (for pagination)
    const countQuery = `SELECT COUNT(*) FROM products p ${whereCondition}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // 2. Get Paginated Data
    // We need the variant_count and base_price from the product_variants table.
    const productQuery = `
      SELECT 
          p.id, 
          p.name, 
          p.short_name, 
          p.unit_of_measure AS uom,
          p.is_active,
          c.name AS category_name, 
          b.name AS brand_name,
          -- Get count of variants for this product
          (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) AS variant_count,
          -- Get the lowest selling price as the base price
          (SELECT MIN(pv.selling_price) FROM product_variants pv WHERE pv.product_id = p.id) AS base_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereCondition}
      ORDER BY p.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    // Add LIMIT and OFFSET parameters
    queryParams.push(limit, offset);

    const result = await pool.query(productQuery, queryParams);
    
    // Send the paginated response object
    res.json({
      page: parseInt(page),
      per_page: limit,
      total: total,
      data: result.rows
    });
    
  } catch(err){ 
    console.error("Error in getAllProducts:", err.message);
    res.status(500).json({error: "Failed to fetch products: " + err.message}); 
  }

  // const pool = await getPool(); 
  // try{
  //   const result = await pool.query(`
  //     SELECT p.*, c.name AS category_name, b.name AS brand_name
  //     FROM products p
  //     LEFT JOIN categories c ON p.category_id=c.id
  //     LEFT JOIN brands b ON p.brand_id=b.id
  //     ORDER BY p.id DESC
  //   `);
  //   res.json(result.rows);
  // } catch(err){ res.status(500).json({error: err.message}); }
};


export const getProductById = async (req,res)=>{
  const pool = await getPool(); 
  const {id}=req.params;
  try{
    const result = await pool.query('SELECT * FROM products WHERE id=$1',[id]);
    if(!result.rows.length) return res.status(404).json({error:'Product not found'});
    res.json(result.rows[0]);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const addProduct = async (req,res)=>{
  const pool = await getPool(); 
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
  const pool = await getPool(); 
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
  const pool = await getPool(); 
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
                product_variants pv ON p.id = pv.id
            JOIN 
                inventory inv ON pv.id = inv.id
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

// NEW/UPDATED function
export const getProductOptionValues = async (req,res)=>{
  const pool = await getPool(); 
  try{
    const result = await pool.query(`
      SELECT id, option_id, value 
      FROM product_variant_option_values
      ORDER BY option_id, id
    `);
    res.json(result.rows);
  } catch(err){ res.status(500).json({error: err.message}); }
};

// UPDATED function
export const getVariantOptions = async (req,res)=>{
  const pool = await getPool(); 
  try{
    // Fetch options
    const optionsResult = await pool.query(`
      SELECT id, name
      FROM product_variant_options
      ORDER BY name
    `);
    const options = optionsResult.rows;

    // Fetch all values (using the helper if it was separated, but here we keep it simple)
    const valuesResult = await pool.query(`
      SELECT id, option_id, value 
      FROM product_variant_option_values
    `);
    const values = valuesResult.rows;

    // Nest values into options (as requested by frontend optimization)
    const nestedOptions = options.map(opt => ({
      ...opt,
      // Filter values that belong to this option ID
      values: values.filter(val => val.option_id === opt.id)
    }));
    
    res.json(nestedOptions);
  } catch(err){ 
    console.error("Error in getVariantOptions:", err.message);
    res.status(500).json({error: err.message}); 
  }
};