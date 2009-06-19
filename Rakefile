require 'rake'
require 'rake/packagetask'

PKG_ROOT     = File.expand_path(File.dirname(__FILE__))
PKG_DIST_DIR = File.join(PKG_ROOT, 'dist')
PKG_VERSION  = '0.2.2'

task :default => [:package, :clean_package_source]

Rake::PackageTask.new('jsfsm', PKG_VERSION) do |package|
  package.need_tar_gz = true
  package.package_dir = PKG_DIST_DIR
  package.package_files.include(
    '[A-Z]*',
    "fsm.js",
    'examples/**',
    'lib/**',
    'spec/**'
  )
end
task :clean_package_source do
  rm_rf File.join(PKG_DIST_DIR, "jsfsm-#{PKG_VERSION}")
end
