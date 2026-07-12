function listUsers(db) {
  return (req, res) => {
    try {
      // Exclut l'utilisateur courant de la liste
      const users = db
        .prepare('SELECT id, username, email FROM users WHERE id != ? ORDER BY username ASC')
        .all(req.user.id);
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Impossible de récupérer la liste des utilisateurs." });
    }
  };
}

module.exports = { listUsers };
