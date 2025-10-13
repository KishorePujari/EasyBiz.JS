import pool from '../db/pool.js';

export const getAllVariants = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM product_variants ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getVariantById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM product_variants WHERE id=$1', [id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Variant not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const addVariant = async (req, res) => {
    const { product_id, variant_name, color, size, hsn_code, mrp, selling_price, purchase_price } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO product_variants (product_id, variant_name, color, size, hsn_code, mrp, selling_price, purchase_price)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [product_id, variant_name, color, size, hsn_code, mrp, selling_price, purchase_price]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateVariant = async (req, res) => {
    const { id } = req.params;
    const { product_id, variant_name, color, size, hsn_code, mrp, selling_price, purchase_price } = req.body;
    try {
        const result = await pool.query(
            `UPDATE product_variants SET product_id=$1, variant_name=$2, color=$3, size=$4, hsn_code=$5, mrp=$6, selling_price=$7, purchase_price=$8
       WHERE id=$9 RETURNING *`,
            [product_id, variant_name, color, size, hsn_code, mrp, selling_price, purchase_price, id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Variant not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteVariant = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM product_variants WHERE id=$1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}