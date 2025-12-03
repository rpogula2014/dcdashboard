// This helps use auto generate libraries you can use in the language of
// your choice. You can have multiple generators if you use multiple languages.
// Just ensure that the output_dir is different for each generator.


// Python generator for backend
generator python {
    output_type "python/pydantic"
    output_dir ".."
    version "0.214.0"
    default_client_mode async
}
