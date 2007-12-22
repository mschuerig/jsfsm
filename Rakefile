require 'rake'
require 'rake/packagetask'

SPEC_ROOT     = File.expand_path(File.dirname(__FILE__))
SPEC_DIST_DIR = File.join(SPEC_ROOT, 'dist')
SPEC_VERSION  = '0.1'

task :default => [:package, :clean_package_source]

Rake::PackageTask.new('jsfsm', SPEC_VERSION) do |package|
  package.need_tar_gz = true
  package.package_dir = SPEC_DIST_DIR
  package.package_files.include(
    '[A-Z]*',
    "fsm.js",
    'lib/**',
    'spec/**'
  )
end
task :clean_package_source do
  rm_rf File.join(SPEC_DIST_DIR, "jsfsm-#{SPEC_VERSION}")
end
