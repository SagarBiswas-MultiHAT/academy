import ReactMarkdown from 'react-markdown';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';

const markdown = '![](http://localhost:5000/api/v1/books/google-dorks-complete-handbook/media/media/image1.png){width="7.26805in"}';
const element = createElement(ReactMarkdown, {}, markdown);
console.log(renderToString(element));
