export default function UsersSidebar({ users, onlineUsernames, selectedUserId, onSelectUser, currentUser, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="me">{currentUser.username}</span>
        <button className="logout-button" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
      <h3>Utilisateurs</h3>
      <ul className="users-list">
        {users.length === 0 && <li className="empty-state-small">Aucun autre utilisateur pour l'instant.</li>}
        {users.map((u) => {
          const isOnline = onlineUsernames.includes(u.username);
          return (
            <li
              key={u.id}
              className={`user-item ${selectedUserId === u.id ? 'active' : ''}`}
              onClick={() => onSelectUser(u)}
            >
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
              {u.username}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
