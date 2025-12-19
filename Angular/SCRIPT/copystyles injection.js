function getClassesAndStyles(element) {
            const classes = new Set();
            const allElements = element.querySelectorAll('*');
            allElements.forEach(el => {
                el.classList.forEach(cls => classes.add(cls));
            });
            return Array.from(classes);
        }

        function getAllStyles() {
            let css = '';
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        css += rule.cssText + '\n';
                    }
                } catch (e) {
                    console.warn('Access to stylesheet is restricted:', sheet.href);
                }
            }
            return css;
        }

        function getElementStyles(element) {
            const styles = window.getComputedStyle(element);
            let stylesStr = '';
            for (let i = 0; i < styles.length; i++) {
                const styleName = styles[i];
                if (styleName !== 'width' && styleName !== 'height') {
                    stylesStr += `${styleName}: ${styles.getPropertyValue(styleName)};\n`;
                }
            }
            return stylesStr;
        }

        function downloadDivAndStyles() {
            const treemap = document.querySelector('#treemap');
            if (!treemap) return;

            const classes = getClassesAndStyles(treemap);
            const allStyles = {};

            classes.forEach(className => {
                const element = treemap.querySelector(`.${className}`);
                if (element) {
                    const styles = getElementStyles(element);
                    allStyles[className] = styles;
                }
            });

            let styleString = '<style>\n';
            for (const [className, styles] of Object.entries(allStyles)) {
                styleString += `.${className} {\n${styles}}\n`;
            }
            styleString += getAllStyles();
            styleString += '</style>\n';

            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Treemap</title>
                    ${styleString}
                </head>
                <body>
                    ${treemap.outerHTML}
                </body>
                </html>
            `;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'treemap.html';
            a.click();
            URL.revokeObjectURL(url);
        }
        downloadDivAndStyles() 