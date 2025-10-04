import ReactDOM from 'react-dom';

let rootContainer;

export function createRoot(container) {
  if (!container || !(container instanceof HTMLElement)) {
    if (!rootContainer) {
      rootContainer = document.createElement('div');
      document.body.appendChild(rootContainer);
    }
  } else {
    rootContainer = container;
  }

  return {
    render: (ui) => ReactDOM.render(ui, rootContainer),
    unmount: () => ReactDOM.unmountComponentAtNode(rootContainer),
  }
}
