document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('searchForm');
    const resultsContainer = document.getElementById('results');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const term = document.getElementById('searchTerm').value.trim();
      if (!term) return;
  
      const res = await fetch(`/search?term=${encodeURIComponent(term)}`);
      const songs = await res.json();
      resultsContainer.innerHTML = '';
  
      if (songs.length === 0) {
        resultsContainer.innerHTML = '<p>No songs found.</p>';
        return;
      }
  
      songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'songResult';
  
        div.innerHTML = `
          <p><strong>${song.title}</strong> by ${song.artist}</p>
          <img src="${song.artwork}" width="100">
          <button>Add to Playlist</button>
          <hr>
        `;
  
        div.querySelector('button').addEventListener('click', async () => {
          const response = await fetch('/playlist/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(song)
          });
  
          if (response.ok) {
            alert('Song added to playlist!');
            // Optimistically add song to the visible playlist
            const playlistDiv = document.createElement('div');
            playlistDiv.className = 'playlist-item';
            playlistDiv.innerHTML = `
            <p><strong>${song.title}</strong> by ${song.artist}</p>
            <img src="${song.artwork}" width="100">
            <button class="delete-btn" data-id="new">Remove</button>
            <hr>
            `;
            playlistDiv.querySelector('.delete-btn').addEventListener('click', () => {
            playlistDiv.remove(); // optimistic delete for "new" items
            });
            document.querySelector('h2 + div')?.insertAdjacentElement('afterend', playlistDiv);
          } else {
            alert('Failed to add song.');
          }
        });
  
        resultsContainer.appendChild(div);
      });
    });
  });
  // Delete button functionality
document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const res = await fetch(`/playlist/delete/${id}`, { method: 'POST' });
      if (res.ok) {
        btn.closest('.playlist-item').remove();
      } else {
        alert('Failed to delete song.');
      }
    });
  });
  