/* global window */

const CONTAINER_ID = 'container';
const CAPTION_ID = 'caption';

class View {
  constructor(datasetId) {
    this.datasetId = datasetId;
    this.data = [];
    this.index = 0;

    window.Cortex.app.onData(this.datasetId, (rows, cached) => {
      this.onData(rows, cached);
    });
  }

  prepare(offer) {
    if (this.data.length === 0) {
      offer();
      return;
    }

    if (this.index >= this.data.length) {
      this.index = 0;
    }

    let row = this.data[this.index];
    let container = window.document.getElementById(CONTAINER_ID);
    let caption = window.document.getElementById(CAPTION_ID);
    this._createDOMNode(container, row.url)
      .then(node => {
        let view = done => {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }

          caption.innerHTML = row.caption;

          this._playVideo(container, node)
            .then(() => {
              console.log("Video finished: " + row.url);
              done();
            }).catch(err => {
              console.error("Failed to play video: " + row.url, err);
              done();
            });
        };

        let opts = {
          label: row.url,
          ttl: 60 * 60 * 1000,
          /* eslint camelcase: 0 */
          companion: {
            asset_url: row.url,
            click_url: 'http://www.cortexpowered.com',
            mime_type: 'video/webm'
          }
        };

        offer(view, opts);
      }).catch(err => {
        console.error("Failed to create a DOM node for " + row.url, err);
        offer();
      });

    this.index += 1;
  }

  onData(rows, cached) {
    console.log("Received data update. cached: " + cached + ", rows: ", rows);
    this._cacheAndSetRows(rows)
      .then(() => {
        console.log("Images are cached.");
      }).catch(function(err) {
        console.error("Failed to cache images.", err);
      });
  }

  _playVideo(container, node) {
    return new Promise((resolve, reject) => {
      node.addEventListener('ended', resolve);
      node.addEventListener('error', reject);
      node.firstChild.addEventListener('error', reject);
      container.appendChild(node);
      node.play();
    });
  }

  _createDOMNode(container, url) {
    return new Promise((resolve, reject) => {
      let node = window.document.createElement('video');
      node.id = url;
      node.setAttribute('autoplay', false);
      node.setAttribute('preload', 'auto');
      node.setAttribute('muted', true);
      node.addEventListener('canplaythrough', () => {
        resolve(node);
      });
      node.addEventListener('error', ev => {
        console.warn('Video player received an error: ' + url, ev);
        reject();
      });

      let source = window.document.createElement('source');
      source.src = url;
      source.addEventListener('error', ev => {
        console.warn('Video player source received an error: ' + url, ev);
        reject();
      });

      node.appendChild(source);
    });
  }

  _cacheAndSetRows(rows) {
    let promises = [];
    const opts = {
      cache: {
        mode: 'normal',
        ttl: 30 * 24 * 60 * 60 * 1000
      }
    };

    for (let row of rows) {
      if (row.url) {
        promises.push(window.Cortex.net.get(row.url, opts));
      }
    }

    return new Promise((resolve, reject) => {
      Promise.all(promises).then(() => {
        this.data = rows;
        resolve();
      }).catch(reject);
    });
  }
}

export default View;
