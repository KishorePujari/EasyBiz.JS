// POST /api/brands - Create Brand
export const createBrand = async (req, res) => {
    if (!req.user || !req.user.features.includes('MANAGE_BRANDS')) return res.status(403).json({ message: "Forbidden." });
    try {
        const pool = await getPool();
        const { name, description, is_active } = req.body;
        if (!name) return res.status(400).json({ message: "Brand name is required." });

        const query = `
            INSERT INTO brands (name, description, is_active, updated_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, is_active;
        `;
        const values = [name, description || null, is_active === undefined ? true : is_active, req.user.id];
        const result = await pool.query(query, values);
        res.status(201).json({ message: "Brand created successfully.", brand: result.rows[0] });
    } catch (err) {
        console.error("Create Brand Error:", err.message);
        if (err.code === '23505') return res.status(409).json({ message: "Brand name already exists." });
        res.status(500).json({ message: "Server error creating brand." });
    }
};

// GET /api/brands - Read All Brands
export const getBrands = async (req, res) => {
    if (!req.user || !req.user.features.some(f => ['VIEW_BRANDS', 'MANAGE_BRANDS'].includes(f))) return res.status(403).json({ message: "Forbidden." });
    try {
        const pool = await getPool();
        const query = `SELECT id, name, description, is_active FROM brands ORDER BY name ASC;`;
        const result = await pool.query(query);
        res.status(200).json({ message: "Brands fetched successfully.", brands: result.rows });
    } catch (err) {
        console.error("Get Brands Error:", err.message);
        res.status(500).json({ message: "Server error fetching brands." });
    }
};

// PUT /api/brands/:id - Update Brand
export const updateBrand = async (req, res) => {
    if (!req.user || !req.user.features.includes('MANAGE_BRANDS')) return res.status(403).json({ message: "Forbidden." });
    try {
        const pool = await getPool();
        const brandId = req.params.id;
        const { name, description, is_active } = req.body;
        if (!name) return res.status(400).json({ message: "Brand name is required." });
        
        const query = `
            UPDATE brands
            SET name = $1, description = $2, is_active = $3, updated_at = NOW(), updated_by = $4
            WHERE id = $5
            RETURNING id;
        `;
        const values = [name, description || null, is_active, req.user.id, brandId];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) return res.status(404).json({ message: "Brand not found." });
        res.status(200).json({ message: "Brand updated successfully.", id: brandId });
    } catch (err) {
        console.error("Update Brand Error:", err.message);
        if (err.code === '23505') return res.status(409).json({ message: "Brand name already exists." });
        res.status(500).json({ message: "Server error updating brand." });
    }
};

// DELETE /api/brands/:id - Soft Delete Brand
export const deleteBrand = async (req, res) => {
    if (!req.user || !req.user.features.includes('MANAGE_BRANDS')) return res.status(403).json({ message: "Forbidden." });
    try {
        const pool = await getPool();
        const brandId = req.params.id;

        // Soft Delete: Set is_active to FALSE
        const query = `
            UPDATE brands
            SET is_active = FALSE, updated_at = NOW(), updated_by = $1
            WHERE id = $2
            RETURNING id;
        `;
        
        const result = await pool.query(query, [req.user.id, brandId]);

        if (result.rowCount === 0) return res.status(404).json({ message: "Brand not found or already inactive." });
        res.status(200).json({ message: "Brand soft-deleted successfully (set to inactive).", id: brandId });
    } catch (err) {
        console.error("Delete Brand Error:", err.message);
        res.status(500).json({ message: "Server error deleting brand." });
    }
};