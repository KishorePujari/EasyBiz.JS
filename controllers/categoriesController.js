// POST /api/categories
export const createCategory = async (req, res) => {
    // ⚠️ Security Check: Requires 'MANAGE_CATEGORIES' permission
    if (!req.user || !req.user.features.includes('MANAGE_CATEGORIES')) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions." });
    }
    
    try {
        const pool = await getPool();
        const { name, description, is_active } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Category name is required." });
        }

        // Generate a simple unique category ID (optional, but good practice)
        // In a real app, this would use a sequence or UUID.
        // For simplicity, we assume 'category_id' is serial or auto-generated.

        const query = `
            INSERT INTO categories (name, description, is_active, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $4)
            RETURNING category_id, name, is_active;
        `;
        
        // Use req.user.id from the JWT payload for audit fields
        const values = [name, description || null, is_active === undefined ? true : is_active, req.user.id];
        
        const result = await pool.query(query, values);

        res.status(201).json({ 
            message: "Category created successfully.", 
            category: result.rows[0] 
        });

    } catch (err) {
        console.error("Create Category Error:", err.message);
        // Handle unique constraint violation if category name must be unique
        if (err.code === '23505') { 
             return res.status(409).json({ message: "Category name already exists." });
        }
        res.status(500).json({ message: "Server error creating category." });
    }
};

// GET /api/categories
export const getCategories = async (req, res) => {
    // ⚠️ Security Check: Requires 'VIEW_CATEGORIES' or 'MANAGE_CATEGORIES'
    if (!req.user || !req.user.features.some(f => ['VIEW_CATEGORIES'].includes(f))) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions." });
    }
    
    try {
        const pool = await getPool();
        
        // Order by name for a cleaner UI list
        const query = `
            SELECT category_id, name, description, is_active 
            FROM categories
            ORDER BY name ASC;
        `;
        
        const result = await pool.query(query);

        res.status(200).json({ 
            message: "Categories fetched successfully.", 
            categories: result.rows 
        });

    } catch (err) {
        console.error("Get Categories Error:", err.message);
        res.status(500).json({ message: "Server error fetching categories." });
    }
};

// PUT /api/categories/:id
export const updateCategory = async (req, res) => {
    // ⚠️ Security Check: Requires 'MANAGE_CATEGORIES' permission
    if (!req.user || !req.user.features.includes('MANAGE_CATEGORIES')) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions." });
    }

    try {
        const pool = await getPool();
        const categoryId = req.params.id;
        const { name, description, is_active } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Category name is required." });
        }
        
        const query = `
            UPDATE categories
            SET 
                name = $1, 
                description = $2, 
                is_active = $3,
                updated_at = NOW(),
                updated_by = $4
            WHERE category_id = $5
            RETURNING category_id;
        `;
        
        const values = [name, description || null, is_active, req.user.id, categoryId];
        
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.status(200).json({ 
            message: "Category updated successfully.", 
            category_id: categoryId 
        });

    } catch (err) {
        console.error("Update Category Error:", err.message);
        if (err.code === '23505') { 
             return res.status(409).json({ message: "Category name already exists." });
        }
        res.status(500).json({ message: "Server error updating category." });
    }
};


// DELETE /api/categories/:id
export const deleteCategory = async (req, res) => {
    // ⚠️ Security Check: Requires 'MANAGE_CATEGORIES' permission
    if (!req.user || !req.user.features.includes('MANAGE_CATEGORIES')) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions." });
    }

    try {
        const pool = await getPool();
        const categoryId = req.params.id;

        // Soft Delete: Set is_active to FALSE
        const query = `
            UPDATE categories
            SET 
                is_active = FALSE, 
                updated_at = NOW(),
                updated_by = $1
            WHERE category_id = $2
            RETURNING category_id;
        `;
        
        const result = await pool.query(query, [req.user.id, categoryId]);

        if (result.rowCount === 0) {
            // Check if the ID exists but was already inactive (not strictly necessary but thorough)
            return res.status(404).json({ message: "Category not found or already inactive." });
        }

        res.status(200).json({ 
            message: "Category soft-deleted successfully (set to inactive).", 
            category_id: categoryId 
        });

    } catch (err) {
        console.error("Delete Category Error:", err.message);
        res.status(500).json({ message: "Server error deleting category." });
    }
};

