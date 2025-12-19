tinymce.init({
    selector: 'textarea',  // change this value according to your HTML
    plugins: ['accordion', 'advlist', 'anchor', 'autolink', 'autoresize', 'autosave', 'charmap', 'code', 'codesample', 'directionality', 'emoticons', 'fullscreen', 'help', 'image', 'importcss', 'insertdatetime',
        'link', 'lists', 'media', 'nonbreaking', 'pagebreak', 'preview', 'quickbars', 'save', 'searchreplace', 'table', 'template', 'visualblocks', 'visualchars', 'wordcount'],
    //  menubar: 'insert',
    toolbar: 'table image',
    image_caption: true,
    a_plugin_option: true,
    a_configuration_option: 400,
    toolbar1: 'undo redo | insert | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media blockquote',
    image_advtab: true,
    templates: [
        { title: 'Test template 1', content: 'Test 1' },
        { title: 'Test template 2', content: 'Test 2' }
    ],
    content_css: [
        '/Content/main.css',
        '/Content/component-new-menu.css',
        '/Content/common.css',
        '/Content/whitebody.css',
    ],
    convert_urls: false
});
